import { XMLParser } from 'fast-xml-parser';

export type DiffRequest = {
    baseXml: string;
    headXml: string;
    filePath: string;
};

export type ContextHint = { key: string; value: string };

export type GraphNode = {
    id: string;
    label: string;
    type: string;
    state: 'added' | 'removed' | 'modified' | 'unchanged';
    attributes: Record<string, string>;
    path: string;
    contextHints: ContextHint[];
    parentFlowId?: string;  // which flow/sub-flow directly owns this node
};

export type GraphEdge = {
    id: string;
    source: string;
    target: string;
    crossFlow?: boolean;  // true = flow-ref call edge (rendered as dashed/animated)
};

export type DiffResponse = {
    nodes: GraphNode[];
    edges: GraphEdge[];
    error?: string;
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    ignoreDeclaration: true,
    preserveOrder: true,  // CRITICAL for Mule flows to maintain sequence execution
});

function safeParse(xmlStr: string) {
    if (!xmlStr || !xmlStr.trim()) return [];
    try {
        return parser.parse(xmlStr);
    } catch(e) {
        try {
            return parser.parse(`<root>${xmlStr}</root>`);
        } catch(fallbackErr) {
            console.warn("Failed to parse partial XML, even with wrapper.");
            throw e;
        }
    }
}

// ── Context Hints ────────────────────────────────────────────────────────────
// Extracts meaningful display attributes per MuleSoft component type.
function extractContextHints(tag: string, attrs: Record<string, string>, children: any[]): ContextHint[] {
    const hints: ContextHint[] = [];
    const ns = tag.includes(':') ? tag.split(':')[0] : '';
    const local = tag.includes(':') ? tag.split(':').pop()! : tag;
    const a = attrs; // alias for brevity

    const add = (key: string, val: string | undefined | null) => {
        if (val && val.trim()) hints.push({ key, value: val.trim().length > 80 ? val.trim().slice(0, 80) + '…' : val.trim() });
    };

    // ── HTTP ──────────────────────────────────────────────────────────────────
    if (ns === 'http' && local === 'listener') {
        add('path', a['@_path']);
        add('methods', a['@_allowedMethods']);
        add('config', a['@_config-ref']);
    }
    if (ns === 'http' && local === 'request') {
        add('method', a['@_method']);
        add('path', a['@_path']);
        add('url', a['@_url']);
        add('config', a['@_config-ref']);
    }
    if (local === 'listener-config' || local === 'request-config') {
        add('host', a['@_host']);
        add('port', a['@_port']);
        add('basePath', a['@_basePath']);
    }

    // ── Database ──────────────────────────────────────────────────────────────
    if (ns === 'db') {
        add('config', a['@_config-ref']);
        // SQL text lives in a <db:sql> or <db:parameterized-query> child
        for (const child of children) {
            for (const key of Object.keys(child)) {
                if (key.includes('sql') || key.includes('parameterized') || key.includes('query')) {
                    const content = child[key];
                    const text = Array.isArray(content)
                        ? (content.find((c: any) => c['#text'])?.[' #text'] || content.find((c: any) => c['#text'])?.['#text'] || '')
                        : (typeof content === 'string' ? content : '');
                    if (text) add('sql', text.replace(/\s+/g, ' ').trim());
                }
            }
        }
    }

    // ── Logger ────────────────────────────────────────────────────────────────
    if (local === 'logger') {
        add('level', a['@_level']);
        add('msg', a['@_message']);
    }

    // ── Control Flow ─────────────────────────────────────────────────────────
    if (local === 'foreach') {
        add('each', a['@_collection']);
        add('batchSize', a['@_batchSize']);
    }
    if (local === 'when') {
        add('when', a['@_expression']);
    }
    if (local === 'otherwise') {
        hints.push({ key: 'when', value: '(default branch)' });
    }
    if (local === 'choice') {
        const branches = children.filter(c => Object.keys(c).some(k => !k.startsWith(':') && !k.startsWith('#'))).length;
        if (branches) add('branches', String(branches));
    }
    if (local === 'scatter-gather') {
        const routes = children.filter(c => Object.keys(c).some(k => k.includes('route'))).length;
        if (routes) add('routes', String(routes));
    }
    if (local === 'until-successful') {
        add('maxRetries', a['@_maxRetries']);
        add('millisBetweenRetries', a['@_millisBetweenRetries']);
    }
    if (local === 'async') {
        add('maxConcurrency', a['@_maxConcurrency']);
    }
    if (local === 'try') {
        add('transactionalAction', a['@_transactionalAction']);
    }

    // ── Messaging ─────────────────────────────────────────────────────────────
    if (ns === 'amqp' || ns === 'jms') {
        add('queue', a['@_queueName'] || a['@_exchangeName'] || a['@_destination']);
        add('config', a['@_config-ref']);
    }
    if (ns === 'kafka') {
        add('topic', a['@_topic']);
        add('config', a['@_config-ref']);
    }
    if (ns === 'vm') {
        add('queue', a['@_queueName']);
        add('config', a['@_config-ref']);
    }

    // ── File/SFTP/FTP ─────────────────────────────────────────────────────────
    if (ns === 'file' || ns === 'sftp' || ns === 'ftp') {
        add('directory', a['@_directory'] || a['@_directoryPath']);
        add('pattern', a['@_fileNamePattern'] || a['@_filenamePattern']);
        add('config', a['@_config-ref']);
    }

    // ── Variables / Payload ───────────────────────────────────────────────────
    if (local === 'set-variable') {
        add('var', a['@_variableName']);
        add('value', a['@_value']);
    }
    if (local === 'set-payload') {
        add('value', a['@_value']);
    }
    if (local === 'remove-variable') {
        add('var', a['@_variableName']);
    }

    // ── EE Transform ─────────────────────────────────────────────────────────
    if (ns === 'ee' && local === 'transform') {
        // Script content lives in child nodes — just flag it
        hints.push({ key: 'type', value: 'DataWeave' });
    }

    // ── Flow-ref ─────────────────────────────────────────────────────────────
    if (local === 'flow-ref') {
        add('calls', a['@_name']);
    }

    // ── Error handlers ────────────────────────────────────────────────────────
    if (local === 'on-error-continue' || local === 'on-error-propagate') {
        add('type', a['@_type']);
        add('when', a['@_when']);
    }

    // ── Generic config ────────────────────────────────────────────────────────
    if (local.includes('config')) {
        add('host', a['@_host']);
        add('port', a['@_port']);
        add('url', a['@_url']);
    }

    return hints;
}

export async function parseGraphDiff(req: DiffRequest): Promise<DiffResponse> {
    try {
        const { baseXml, headXml, filePath } = req;
        console.log(`[Parser] Received diff request for ${filePath}`);
        
        const baseAST = safeParse(baseXml);
        const headAST = safeParse(headXml);
        
        const edges: GraphEdge[] = [];
        
        const baseMap = new Map<string, GraphNode>();
        const headMap = new Map<string, GraphNode>();

        // ── MuleSoft topology classification ─────────────────────────────────
        //
        // SEQUENTIAL: direct children form a linear pipeline
        //   flow → step1 → step2 → step3
        const SEQUENTIAL_CONTAINERS = new Set([
            'flow', 'sub-flow', 'try', 'foreach', 'parallel-foreach',
            'async', 'until-successful',
            'on-error-continue', 'on-error-propagate', 'error-handler',
        ]);

        // BRANCHING: direct children are parallel/alternative branches (fan-out from parent)
        //   choice → when-A, choice → when-B
        const BRANCHING_CONTAINERS = new Set([
            'choice', 'scatter-gather', 'round-robin', 'first-successful',
        ]);

        // INDEPENDENT: direct children are completely disconnected peers — no edges between them.
        // The <mule> root is the canonical example: <http:listener-config>, <db:config>,
        // <flow>, <sub-flow> are all siblings with zero topology relationship.
        const INDEPENDENT_CONTAINERS = new Set([
            'mule', 'root', // 'root' is our virtual wrapper
        ]);

        // Tags to skip entirely (structural XML noise, not Mule processors)
        const SKIP_TAGS = new Set([
            ':@', '#text', '#comment',
        ]);

        type Topology = 'sequential' | 'branching' | 'independent';

        function childTopology(tag: string): Topology {
            const localName = tag.includes(':') ? tag.split(':').pop()! : tag;
            if (SEQUENTIAL_CONTAINERS.has(tag) || SEQUENTIAL_CONTAINERS.has(localName)) return 'sequential';
            if (BRANCHING_CONTAINERS.has(tag) || BRANCHING_CONTAINERS.has(localName))  return 'branching';
            if (INDEPENDENT_CONTAINERS.has(tag) || INDEPENDENT_CONTAINERS.has(localName)) return 'independent';
            // Default: treat unknown containers as sequential (safe for custom scopes, validators, etc.)
            return 'sequential';
        }

        function traverse(
            astArray: any[],
            contextPath: string,
            mapList: Map<string, GraphNode>,
            parentId: string | null,
            parentTopology: Topology,
            recordEdges: boolean,
            enclosingFlowId: string | null   // tracks which flow/sub-flow we're currently inside
        ) {
            const siblingIds: string[] = [];

            for (let index = 0; index < astArray.length; index++) {
                const item = astArray[index];
                const keys = Object.keys(item).filter(k => !SKIP_TAGS.has(k));

                for (const tag of keys) {
                    const attrs = item[':@'] || {};
                    const idAttr = attrs['@_doc:id'] || `${contextPath}/${tag}[${index}]`;
                    const nameAttr = attrs['@_name'] || attrs['@_doc:name'] || tag;

                    const children = Array.isArray(item[tag]) ? item[tag] : [];
                    const node: GraphNode = {
                        id: idAttr,
                        label: nameAttr.replace(/^@_/, ''),
                        type: tag,
                        state: 'unchanged',
                        attributes: attrs,
                        path: idAttr,
                        contextHints: extractContextHints(tag, attrs, children),
                        parentFlowId: enclosingFlowId || undefined,
                    };

                    mapList.set(idAttr, node);
                    siblingIds.push(idAttr);

                    // Recurse — the topology for the children is determined by this tag
                    if (Array.isArray(item[tag]) && item[tag].length > 0) {
                        // When entering a flow/sub-flow, it becomes the new enclosing context.
                        // Nested scopes (try, foreach, etc.) keep the same enclosingFlowId.
                        const nextEnclosingFlowId =
                            (tag === 'flow' || tag === 'sub-flow') ? idAttr : enclosingFlowId;
                        traverse(item[tag], idAttr, mapList, idAttr, childTopology(tag), recordEdges, nextEnclosingFlowId);
                    }
                }
            }

            if (!recordEdges || siblingIds.length === 0) return;

            switch (parentTopology) {
                case 'sequential':
                    // flow → step1 → step2 → step3 (parent connects only to first)
                    if (parentId) {
                        edges.push({ id: `e-${parentId}-${siblingIds[0]}`, source: parentId, target: siblingIds[0] });
                    }
                    for (let i = 0; i < siblingIds.length - 1; i++) {
                        edges.push({ id: `e-${siblingIds[i]}-${siblingIds[i + 1]}`, source: siblingIds[i], target: siblingIds[i + 1] });
                    }
                    break;

                case 'branching':
                    // choice → whenA, choice → whenB (parent fans out to each child independently)
                    for (const sibId of siblingIds) {
                        if (parentId) {
                            edges.push({ id: `e-${parentId}-${sibId}`, source: parentId, target: sibId });
                        }
                    }
                    break;

                case 'independent':
                    // mule root: <flow>, <sub-flow>, <db:config> etc. — NO edges whatsoever
                    break;
            }
        }

        // Top-level is our virtual 'root' wrapper — always independent
        traverse(baseAST, 'root', baseMap, null, 'independent', false, null);
        traverse(headAST, 'root', headMap, null, 'independent', true, null);

        const nodes: GraphNode[] = [];

        for (const [id, headNode] of headMap.entries()) {
            const baseNode = baseMap.get(id);
            if (!baseNode) {
                headNode.state = 'added';
                nodes.push(headNode);
            } else {
                if (JSON.stringify(headNode.attributes) !== JSON.stringify(baseNode.attributes)) {
                    headNode.state = 'modified';
                }
                nodes.push(headNode);
            }
        }

        for (const [id, baseNode] of baseMap.entries()) {
            if (!headMap.has(id)) {
                baseNode.state = 'removed';
                nodes.push(baseNode);
            }
        }

        return { nodes, edges };
    } catch (err: any) {
        return { nodes: [], edges: [], error: err.message || 'Unknown error in XML Parser Engine' };
    }
}
