/**
 * buildDisplayGraph
 *
 * An improved, simplified logic for inline expansion:
 * 1. Never hide original nodes or edges (except re-wired ones).
 * 2. Expanding a flow-ref ALWAYS clones the target sub-flow's internals.
 * 3. This ensures no state-management conflicts or vanishing nodes.
 */

import { GraphNode, GraphEdge } from '../parser';

export type DisplayNode = GraphNode & {
    inlinedFromFlow?: string;
};

export type DisplayEdge = GraphEdge;

export function buildDisplayGraph(
    rawNodes: GraphNode[],
    rawEdges: GraphEdge[],
    expandedFlowRefs: Set<string>,
): { displayNodes: DisplayNode[]; displayEdges: DisplayEdge[] } {

    // ── Pre-compute lookups ───────────────────────────────────────────────
    const subFlowByName = new Map<string, GraphNode>();
    for (const n of rawNodes) {
        if (n.type === 'sub-flow') {
            const name = n.attributes['@_name'] || n.label;
            if (name) subFlowByName.set(name, n);
        }
    }

    const stepsByFlow = new Map<string, GraphNode[]>();
    for (const n of rawNodes) {
        if (n.parentFlowId) {
            const arr = stepsByFlow.get(n.parentFlowId) || [];
            arr.push(n);
            stepsByFlow.set(n.parentFlowId, arr);
        }
    }

    // ── Transform Graph ───────────────────────────────────────────────────
    const hiddenEdges = new Set<string>();
    const extraNodes: DisplayNode[] = [];
    const extraEdges: DisplayEdge[] = [];

    const flowRefNodes = rawNodes.filter(n => n.type === 'flow-ref');

    for (const flowRef of flowRefNodes) {
        if (!expandedFlowRefs.has(flowRef.id)) continue;

        const targetName = flowRef.attributes['@_name'];
        if (!targetName) continue;

        const targetSubFlow = subFlowByName.get(targetName);
        if (!targetSubFlow) continue;

        const ownedSteps = stepsByFlow.get(targetSubFlow.id) || [];
        if (ownedSteps.length === 0) continue;

        // Entry point: the step that the sub-flow header connects to
        const entryEdge = rawEdges.find(e => !e.crossFlow && e.source === targetSubFlow.id);
        if (!entryEdge) continue;

        const entryId = entryEdge.target;
        const ownedIds = new Set(ownedSteps.map(n => n.id));

        // Clone nodes and internal edges
        const suffix = `_exp_${flowRef.id.slice(-6)}`;
        const clonedNodes: DisplayNode[] = ownedSteps.map(n => ({
            ...n,
            id: n.id + suffix,
            inlinedFromFlow: targetName,
        }));
        extraNodes.push(...clonedNodes);

        for (const e of rawEdges) {
            if (!e.crossFlow && ownedIds.has(e.source) && ownedIds.has(e.target)) {
                extraEdges.push({
                    ...e,
                    id: `${e.id}${suffix}`,
                    source: e.source + suffix,
                    target: e.target + suffix,
                });
            }
        }

        // Exit points: nodes in the sub-flow with no outgoing sequential edge to another owned node
        const exitIds = ownedSteps
            .filter(n => !rawEdges.some(e => !e.crossFlow && e.source === n.id && ownedIds.has(e.target)))
            .map(n => n.id + suffix);

        // Rewire:
        // 1. flowRef -> inlineEntry
        extraEdges.push({
            id: `path-ent-${flowRef.id}-${suffix}`,
            source: flowRef.id,
            target: entryId + suffix,
        });

        // 2. inlineExits -> flowRef's successors
        const originalSuccessorEdges = rawEdges.filter(e => !e.crossFlow && e.source === flowRef.id);
        for (const e of originalSuccessorEdges) {
            hiddenEdges.add(e.id);
            for (const exitId of exitIds) {
                extraEdges.push({
                    id: `path-ext-${exitId}-${e.target}-${suffix}`,
                    source: exitId,
                    target: e.target,
                });
            }
        }
    }

    // Combine everything, excluding re-wired edges
    const displayNodes: DisplayNode[] = [...rawNodes, ...extraNodes];
    const displayEdges: DisplayEdge[] = [
        ...rawEdges.filter(e => !hiddenEdges.has(e.id) && !e.crossFlow),
        ...extraEdges,
    ];

    return { displayNodes, displayEdges };
}
