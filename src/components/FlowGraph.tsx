import React, { useMemo, useState, useCallback } from 'react';
import ReactFlow, { Background, Controls, MiniMap, MarkerType } from 'reactflow';
import dagre from 'dagre';
import { GraphNode, GraphEdge } from '../parser';
import { FlowNode } from './FlowNode';
import { buildDisplayGraph, DisplayNode } from '../utils/buildDisplayGraph';
import { buildAiDiffSummary } from '../utils/buildAiDiffSummary';
import { AiChatPanel } from './AiChatPanel';

const nodeTypes = { flowNode: FlowNode };

const NODE_W = 220;
const NODE_H = 88;  // taller to accommodate context hints

// ── Dagre Layout ──────────────────────────────────────────────────────────────
const applyDagreLayout = (nodes: DisplayNode[], edges: any[]) => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 90 });

    nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    edges.forEach(e => {
        if (g.hasNode(e.source) && g.hasNode(e.target)) {
            g.setEdge(e.source, e.target);
        }
    });
    dagre.layout(g);

    return nodes.map(n => {
        const pos = g.node(n.id);
        return {
            id: n.id,
            type: 'flowNode',
            targetPosition: 'left' as const,
            sourcePosition: 'right' as const,
            data: (n as any).__reactFlowData,
            position: { x: pos ? pos.x - NODE_W / 2 : 0, y: pos ? pos.y - NODE_H / 2 : 0 },
        };
    });
};

// ── Edge Styles ───────────────────────────────────────────────────────────────
function buildVisualEdges(rawEdges: GraphEdge[]) {
    return rawEdges.map(e => ({
        id: e.id, source: e.source, target: e.target,
        style: { stroke: '#57606a', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#57606a' },
        type: 'default',
    }));
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
    const items = [
        { color: '#2ea043', label: 'Added' },
        { color: '#d4a72c', label: 'Modified' },
        { color: '#cf222e', label: 'Removed' },
        { color: '#d0d7de', label: 'Unchanged' },
    ];
    return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {items.map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#57606a' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: color + '30', border: `2px solid ${color}` }} />
                    {label}
                </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#8250df' }}>
                <span style={{ fontSize: 12 }}>⤵</span> flow-ref (click +/−)
            </div>
        </div>
    );
}

// ── Helper: count direct steps of a sub-flow ─────────────────────────────────
function countSteps(subFlowName: string, rawNodes: GraphNode[]): number {
    // Find sub-flow node by name
    const sf = rawNodes.find(n => n.type === 'sub-flow' && (n.attributes['@_name'] || n.label) === subFlowName);
    if (!sf) return 0;
    return rawNodes.filter(n => n.parentFlowId === sf.id).length;
}

// ── Main FlowGraph Component ──────────────────────────────────────────────────
export function FlowGraph({ rawNodes, rawEdges, mode = 'diff', filePath = '', baseXml = '', headXml = '' }: {
    rawNodes: GraphNode[];
    rawEdges: GraphEdge[];
    mode?: 'diff' | 'view';
    filePath?: string;
    baseXml?: string;
    headXml?: string;
}) {
    const [expandedFlowRefs, setExpandedFlowRefs] = useState<Set<string>>(new Set());
    const [chatOpen, setChatOpen] = useState(false);

    const toggleFlowRef = useCallback((nodeId: string) => {
        setExpandedFlowRefs(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) next.delete(nodeId);
            else next.add(nodeId);
            return next;
        });
    }, []);

    // Build display graph from raw parser output + expansion state
    const { displayNodes, displayEdges } = useMemo(
        () => buildDisplayGraph(rawNodes, rawEdges, expandedFlowRefs),
        [rawNodes, rawEdges, expandedFlowRefs]
    );

    // Attach react-flow data to each display node
    const annotatedNodes: DisplayNode[] = useMemo(() => {
        const subFlowStepCounts = new Map<string, number>();

        return displayNodes.map(n => {
            let stepCount = 0;
            if (n.type === 'flow-ref') {
                const targetName = n.attributes['@_name'];
                if (targetName) {
                    if (!subFlowStepCounts.has(targetName)) {
                        subFlowStepCounts.set(targetName, countSteps(targetName, rawNodes));
                    }
                    stepCount = subFlowStepCounts.get(targetName) || 0;
                }
            }

            return {
                ...n,
                __reactFlowData: {
                    label: n.label,
                    type: n.type,
                    state: n.state,
                    attributes: n.attributes,
                    contextHints: n.contextHints || [],
                    inlinedFromFlow: n.inlinedFromFlow,
                    mode,
                    nodeId: n.id,
                    expanded: expandedFlowRefs.has(n.id),
                    onToggle: n.type === 'flow-ref' ? toggleFlowRef : undefined,
                    stepCount,
                },
            } as DisplayNode & { __reactFlowData: any };
        });
    }, [displayNodes, expandedFlowRefs, toggleFlowRef, mode, rawNodes]);

    const { nodes: rfNodes, edges: rfEdges } = useMemo(() => {
        const nodesWithPositions = applyDagreLayout(annotatedNodes as any[], displayEdges) as any[];
        return { nodes: nodesWithPositions, edges: buildVisualEdges(displayEdges) };
    }, [annotatedNodes, displayEdges]);

    const flowCount = rawNodes.filter(n => n.type === 'flow' || n.type === 'sub-flow').length;
    const expandedCount = expandedFlowRefs.size;
    const diffSummary = useMemo(() => buildAiDiffSummary(rawNodes, rawEdges), [rawNodes, rawEdges]);

    return (
        <div style={{ width: '100%', height: '500px', background: '#f6f8fa', borderBottom: '1px solid #d0d7de', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{ padding: '6px 12px', background: '#eef1f5', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#24292f' }}>
                    🌊 MuleFlow — {flowCount} flow{flowCount !== 1 ? 's' : ''}, {rfNodes.length} nodes
                    {expandedCount > 0 && (
                        <button
                            onClick={() => setExpandedFlowRefs(new Set())}
                            style={{ marginLeft: 10, fontSize: 10, color: '#8250df', background: '#f0eeff', border: '1px solid #8250df40', borderRadius: 4, padding: '1px 6px', cursor: 'pointer' }}>
                            collapse all
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                        onClick={() => setChatOpen(prev => !prev)}
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#0550ae',
                            background: '#ddf4ff',
                            border: '1px solid #54aeff',
                            borderRadius: 999,
                            padding: '4px 10px',
                            cursor: 'pointer',
                        }}
                    >
                        {chatOpen ? '✕ Close AI' : 'AI Chat'}
                    </button>
                    <Legend />
                </div>
            </div>
            {/* Canvas */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: 1 }}>
                    <ReactFlow
                        nodes={rfNodes}
                        edges={rfEdges}
                        nodeTypes={nodeTypes}
                        fitView
                        fitViewOptions={{ padding: 0.15 }}
                        attributionPosition="bottom-left"
                        nodesDraggable={false}
                    >
                        <Background color="#d0d7de" gap={20} />
                        <Controls />
                        <MiniMap
                            nodeColor={n => {
                                const t = (n.data as any)?.type || '';
                                const st = (n.data as any)?.state || '';
                                if (st === 'added') return '#2ea043';
                                if (st === 'removed') return '#cf222e';
                                if (st === 'modified') return '#d4a72c';
                                if (t === 'flow') return '#388bfd';
                                if (t === 'sub-flow') return '#8250df';
                                return '#d0d7de';
                            }}
                            style={{ border: '1px solid #d0d7de' }}
                        />
                    </ReactFlow>
                </div>
                <div style={{ display: chatOpen ? 'flex' : 'none' }}>
                    <AiChatPanel
                        filePath={filePath}
                        baseXml={baseXml}
                        headXml={headXml}
                        diffSummary={diffSummary}
                    />
                </div>
            </div>
        </div>
    );
}
