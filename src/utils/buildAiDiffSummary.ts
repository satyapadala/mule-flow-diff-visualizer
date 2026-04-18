import { GraphEdge, GraphNode } from '../parser';

function safeType(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function safeLabel(node: GraphNode): string {
    return node.attributes?.['@_name'] || node.label || safeType(node.type) || node.id;
}

export function buildAiDiffSummary(rawNodes: GraphNode[], rawEdges: GraphEdge[]): string {
    const changedNodes = rawNodes.filter(node => node.state !== 'unchanged');
    const rootFlows = rawNodes.filter(node => {
        const type = safeType(node.type);
        return type === 'flow' || type === 'sub-flow';
    });

    const sections: string[] = [];
    sections.push(`Diff overview: ${changedNodes.length} changed node(s), ${rawEdges.length} visible edge(s).`);

    if (changedNodes.length === 0) {
        sections.push('No changed nodes were detected in the parsed flow graph.');
        return sections.join('\n');
    }

    for (const flow of rootFlows) {
        const flowName = safeLabel(flow);
        const directChanges = changedNodes.filter(node => node.parentFlowId === flow.id);
        if (directChanges.length === 0 && flow.state === 'unchanged') continue;

        sections.push(`Flow ${flowName}:`);
        if (flow.state !== 'unchanged') {
            sections.push(`- Header state: ${flow.state}`);
        }

        const entries = directChanges.slice(0, 15).map(node => {
            const type = safeType(node.type) || 'unknown';
            const name = safeLabel(node);
            return `- ${node.state.toUpperCase()} ${type} :: ${name}`;
        });

        if (entries.length > 0) {
            sections.push(...entries);
        } else {
            sections.push('- No direct processor-level changes detected.');
        }
    }

    const unscopedChanges = changedNodes.filter(node => {
        if (!node.parentFlowId) {
            const type = safeType(node.type);
            return type !== 'flow' && type !== 'sub-flow';
        }
        return false;
    });

    if (unscopedChanges.length > 0) {
        sections.push('Global or unscoped changes:');
        sections.push(
            ...unscopedChanges.slice(0, 15).map(node =>
                `- ${node.state.toUpperCase()} ${safeType(node.type) || 'unknown'} :: ${safeLabel(node)}`
            ),
        );
    }

    return sections.join('\n');
}
