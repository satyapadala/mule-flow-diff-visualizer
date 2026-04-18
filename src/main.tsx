import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import ReactFlow, {
  Background, Controls, MiniMap, MarkerType,
  BackgroundVariant
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';
import { parseGraphDiff, GraphNode, GraphEdge } from './parser';
import { FlowNode } from './components/FlowNode';
import { buildDisplayGraph, DisplayNode } from './utils/buildDisplayGraph';

// ── Layout Constants ──────────────────────────────────────────────────────────
const FLOW_NODE_W = 280, FLOW_NODE_H = 70;
const PROC_NODE_W = 215, PROC_NODE_H = 95;   // taller for context hints
const CONFIG_NODE_W = 160, CONFIG_NODE_H = 55;

const NODE_TYPES_MAP = { flowNode: FlowNode };

function nodeSize(type: string) {
  if (type === 'flow' || type === 'sub-flow') return { w: FLOW_NODE_W, h: FLOW_NODE_H };
  if (type.includes('config') || type.includes('Config')) return { w: CONFIG_NODE_W, h: CONFIG_NODE_H };
  return { w: PROC_NODE_W, h: PROC_NODE_H };
}

// ── Dagre Layout ─────────────────────────────────────────────────────────────
function applyLayout(displayNodes: DisplayNode[], rawEdges: GraphEdge[], expandedFlowRefs: Set<string>, toggleFlowRef: (id: string) => void, rawNodes: GraphNode[], mode: string) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 90 });

  displayNodes.forEach(n => {
    const { w, h } = nodeSize(n.type);
    g.setNode(n.id, { width: w, height: h });
  });

  rawEdges.forEach(e => {
    if (!e.crossFlow && g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  return displayNodes.map(n => {
    const pos = g.node(n.id);
    const { w, h } = nodeSize(n.type);
    return {
      id: n.id,
      type: 'flowNode',
      targetPosition: 'left',
      sourcePosition: 'right',
      data: {
        label: n.label, type: n.type, state: n.state,
        attributes: n.attributes, contextHints: n.contextHints || [],
        inlinedFromFlow: n.inlinedFromFlow, mode,
        nodeId: n.id,
        expanded: expandedFlowRefs.has(n.id),
        onToggle: n.type === 'flow-ref' ? toggleFlowRef : undefined,
        stepCount: n.type === 'flow-ref'
          ? (() => { const sf = rawNodes.find(x => x.type === 'sub-flow' && (x.attributes['@_name'] || x.label) === n.attributes['@_name']); return sf ? rawNodes.filter(x => x.parentFlowId === sf.id).length : 0; })()
          : 0,
      },
      position: { x: pos ? pos.x - w / 2 : 0, y: pos ? pos.y - h / 2 : 0 },
    };
  });
}

// ── Edge Styling ─────────────────────────────────────────────────────────────
function buildEdges(rawEdges: GraphEdge[]) {
  return rawEdges.map(e => {
    if (e.crossFlow) {
      return {
        id: e.id, source: e.source, target: e.target,
        animated: true,
        style: { stroke: '#8250df', strokeWidth: 2, strokeDasharray: '6 3' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#8250df' },
        label: 'flow-ref',
        labelStyle: { fontSize: 9, fill: '#8250df', fontWeight: 700 },
        labelBgStyle: { fill: '#f0eeff', stroke: '#8250df40', strokeWidth: 1 },
        type: 'default',
      };
    }
    return {
      id: e.id, source: e.source, target: e.target,
      style: { stroke: '#57606a', strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#57606a' },
      type: 'default',
    };
  });
}

// ── Sidebar: Flow Table of Contents ─────────────────────────────────────────
function FlowSidebar({ nodes, onSelect }: { nodes: GraphNode[]; onSelect: (id: string) => void }) {
  const flows = nodes.filter(n => n.type === 'flow' || n.type === 'sub-flow');
  const configs = nodes.filter(n => n.type.includes('config') || n.type.includes('Config'));

  return (
    <div style={{
      width: 220, flexShrink: 0, background: '#0d1117',
      borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#7d8590', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contents</div>
      </div>
      <div style={{ overflow: 'auto', flex: 1, padding: '8px 0' }}>
        {flows.length > 0 && (
          <>
            <div style={{ padding: '4px 14px 2px', fontSize: 10, color: '#7d8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Flows ({flows.length})
            </div>
            {flows.map(f => (
              <button key={f.id} onClick={() => onSelect(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 14px', border: 'none', textAlign: 'left',
                  background: 'transparent', cursor: 'pointer', borderRadius: 0,
                }}>
                <span style={{ fontSize: 14 }}>{f.type === 'sub-flow' ? '↩' : '🌊'}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: f.type === 'sub-flow' ? '#c4b5fd' : '#79c0ff', lineHeight: 1.2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.attributes?.['@_name'] || f.label}
                  </div>
                  <div style={{ fontSize: 9, color: '#7d8590', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.type}</div>
                </div>
              </button>
            ))}
          </>
        )}

        {configs.length > 0 && (
          <>
            <div style={{ padding: '10px 14px 2px', fontSize: 10, color: '#7d8590', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', borderTop: '1px solid #21262d', marginTop: 6 }}>
              Configs ({configs.length})
            </div>
            {configs.map(c => (
              <button key={c.id} onClick={() => onSelect(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '5px 14px', border: 'none', textAlign: 'left',
                  background: 'transparent', cursor: 'pointer',
                }}>
                <span style={{ fontSize: 12 }}>⚙️</span>
                <div style={{ fontSize: 11, color: '#8c959f', maxWidth: 155, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.attributes?.['@_name'] || c.label}
                </div>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ rawNodes, rawEdges, filePath, ref: gitRef }: { rawNodes: GraphNode[]; rawEdges: GraphEdge[]; filePath: string; ref: string }) {
  const flows     = rawNodes.filter(n => n.type === 'flow').length;
  const subflows  = rawNodes.filter(n => n.type === 'sub-flow').length;
  const configs   = rawNodes.filter(n => n.type.includes('config') || n.type.includes('Config')).length;
  const steps     = rawNodes.filter(n => !['flow','sub-flow','mule'].includes(n.type) && !n.type.includes('config') && !n.type.includes('Config')).length;
  const crossRefs = rawEdges.filter(e => e.crossFlow).length;

  const pills = [
    { label: `${flows} Flow${flows !== 1 ? 's' : ''}`,       color: '#79c0ff', bg: '#1f6feb20' },
    { label: `${subflows} Sub-flow${subflows !== 1 ? 's' : ''}`, color: '#c4b5fd', bg: '#6e40c920' },
    { label: `${configs} Config${configs !== 1 ? 's' : ''}`,  color: '#e3b341', bg: '#d4a72c20' },
    { label: `${steps} Step${steps !== 1 ? 's' : ''}`,        color: '#3fb950', bg: '#23863620' },
    ...(crossRefs > 0 ? [{ label: `${crossRefs} flow-ref${crossRefs !== 1 ? 's' : ''}`, color: '#c4b5fd', bg: '#8250df20' }] : []),
  ];

  return (
    <div style={{ background: '#161b22', borderBottom: '1px solid #21262d', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#7d8590', fontFamily: 'monospace', marginRight: 4 }}>
        {filePath} <span style={{ color: '#3fb950' }}>@{gitRef}</span>
      </span>
      <div style={{ width: 1, height: 14, background: '#30363d' }} />
      {pills.map(p => (
        <span key={p.label} style={{
          background: p.bg, color: p.color, padding: '2px 8px',
          borderRadius: 20, fontSize: 11, fontWeight: 600,
          border: `1px solid ${p.color}40`,
        }}>{p.label}</span>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
type Status = 'idle' | 'loading' | 'done' | 'error';

const App = () => {
  const params   = new URLSearchParams(window.location.search);
  const platform = params.get('platform') || 'github';
  const host     = params.get('host') || params.get('sgHost') || 'github.com';
  const owner    = params.get('owner') || '';
  const repo     = params.get('repo') || params.get('repo') || '';
  const gitRef   = params.get('ref') || params.get('revision') || 'main';
  const filePath = params.get('filePath') || '';

  const [status, setStatus]         = useState<Status>(filePath ? 'loading' : 'idle');
  const [error, setError]           = useState('');
  const [rawNodes, setRawNodes]     = useState<GraphNode[]>([]);
  const [rawEdges, setRawEdges]     = useState<GraphEdge[]>([]);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [expandedFlowRefs, setExpandedFlowRefs] = useState<Set<string>>(new Set());

  const toggleFlowRef = useCallback((id: string) => {
    setExpandedFlowRefs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Recompute display graph reactively whenever raw data or expansion state changes
  const { rfNodes, rfEdges } = useMemo(() => {
    if (rawNodes.length === 0) return { rfNodes: [], rfEdges: [] };
    const { displayNodes, displayEdges } = buildDisplayGraph(rawNodes, rawEdges, expandedFlowRefs);
    return {
      rfNodes: applyLayout(displayNodes, displayEdges, expandedFlowRefs, toggleFlowRef, rawNodes, 'view'),
      rfEdges: displayEdges.map(e => ({
        id: e.id, source: e.source, target: e.target,
        style: { stroke: '#57606a', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#57606a' },
        type: 'default',
      })),
    };
  }, [rawNodes, rawEdges, expandedFlowRefs, toggleFlowRef]);

  useEffect(() => {
    if (!filePath) return;
    (async () => {
      try {
        setStatus('loading');
        let xml = '';
        if (platform === 'sourcegraph') {
           const revPart = gitRef && gitRef !== 'main' ? `@${gitRef}` : '';
           const rawUrl = `https://${host}/${repo}${revPart}/-/raw/${filePath}`;
           const res = await fetch(rawUrl, { redirect: 'follow', credentials: 'include' });
           if (!res.ok) throw new Error(`Sourcegraph fetch failed: ${res.statusText}`);
           xml = await res.text();
        } else {
           const rawUrl = `https://${host}/${owner}/${repo}/raw/${gitRef}/${filePath}`;
           const res = await fetch(rawUrl, { redirect: 'follow' });
           if (!res.ok) throw new Error(`GitHub fetch failed: ${res.statusText}`);
           xml = await res.text();
        }

        const result = await parseGraphDiff({ baseXml: xml, headXml: xml, filePath });
        if (result.error) throw new Error(result.error);

        setRawNodes(result.nodes);
        setRawEdges(result.edges);
        setStatus('done');
      } catch (e: any) {
        setError(e.message || 'Unknown error');
        setStatus('error');
      }
    })();
  }, [filePath]);

  const scrollToNode = (nodeId: string) => {
    if (!rfInstance) return;
    const node = rfNodes.find(n => n.id === nodeId);
    if (node) rfInstance.setCenter(node.position.x + 110, node.position.y + 30, { zoom: 1.2, duration: 600 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* ── Top Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1f6feb, #388bfd)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        <span style={{ fontSize: 24 }}>🌊</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>MuleFlow Visualizer</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>{platform === 'sourcegraph' ? repo : `${owner}/${repo}`}</div>
        </div>
        {filePath && (
          <a href={platform === 'sourcegraph' 
              ? `https://${host}/${repo}${gitRef && gitRef !== 'main' ? '@' + gitRef : ''}/-/blob/${filePath}`
              : `https://${host}/${owner}/${repo}/blob/${gitRef}/${filePath}`} 
            target="_blank" rel="noreferrer"
            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.85)', fontSize: 12, textDecoration: 'none', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.25)' }}>
            View on {platform === 'sourcegraph' ? 'Sourcegraph' : 'GitHub'} ↗
          </a>
        )}
      </div>

      {/* ── Stats Bar (only when done) ── */}
      {status === 'done' && <StatsBar rawNodes={rawNodes} rawEdges={rawEdges} filePath={filePath} ref={gitRef} />}

      {/* ── Main Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        {status === 'done' && <FlowSidebar nodes={rawNodes} onSelect={scrollToNode} />}

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          {status === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, opacity: 0.5 }}>
              <span style={{ fontSize: 56 }}>🌊</span>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Open a Mule XML via the extension popup</div>
            </div>
          )}
          {status === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, opacity: 0.7 }}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <span style={{ fontSize: 14 }}>Fetching and parsing {filePath}…</span>
            </div>
          )}
          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#ff7b72' }}>
              <span style={{ fontSize: 40 }}>❌</span>
              <span>{error}</span>
            </div>
          )}
          {status === 'done' && (
            <ReactFlow
              nodes={rfNodes as any[]} edges={rfEdges}
              nodeTypes={NODE_TYPES_MAP}
              fitView fitViewOptions={{ padding: 0.12 }}
              attributionPosition="bottom-right"
              style={{ background: '#0d1117' }}
              onInit={setRfInstance}
            >
              <Background color="#21262d" gap={24} variant={BackgroundVariant.Dots} />
              <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
              <MiniMap
                style={{ background: '#161b22', border: '1px solid #30363d' }}
                nodeColor={n => {
                  const t = (n.data as any)?.type || '';
                  if (t === 'flow') return '#388bfd';
                  if (t === 'sub-flow') return '#8250df';
                  if (t.includes('config') || t.includes('Config')) return '#8c959f';
                  const ns = t.split(':')[0];
                  const nsColorMap: Record<string,string> = { http: '#0969da', db: '#2ea043', ee: '#8250df', amqp: '#db6d28', jms: '#db6d28', kafka: '#db6d28' };
                  return nsColorMap[ns] || '#30363d';
                }}
              />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  );
};

const rootEl = document.getElementById('root');
if (rootEl) ReactDOM.createRoot(rootEl).render(<React.StrictMode><App /></React.StrictMode>);
