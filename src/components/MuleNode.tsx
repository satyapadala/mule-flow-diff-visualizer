import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const STATE_STYLES: Record<string, { bg: string; border: string; badge: string; badgeText: string }> = {
    added:     { bg: '#e6ffec', border: '#2ea043', badge: '#2ea043', badgeText: '+' },
    removed:   { bg: '#ffebe9', border: '#cf222e', badge: '#cf222e', badgeText: '−' },
    modified:  { bg: '#fff8c5', border: '#d4a72c', badge: '#d4a72c', badgeText: '~' },
    unchanged: { bg: '#ffffff', border: '#d0d7de', badge: '#8c959f', badgeText: '·' },
};

const NS_COLORS: Record<string, string> = {
    'http':     '#0969da',
    'ee':       '#8250df',
    'db':       '#1a7f37',
    'amqp':     '#b35900',
    'jms':      '#b35900',
    'kafka':    '#b35900',
    'file':     '#4a6a4a',
    'sftp':     '#4a6a4a',
    'ftp':      '#4a6a4a',
    's3':       '#cf6c00',
    'sqs':      '#cf6c00',
    'vm':       '#6e40c9',
    'flow':     '#0969da',
    'flow-ref': '#8250df', // cross-flow call — purple to match the dashed edge
};

export function MuleNode({ data }: NodeProps) {
    const style = STATE_STYLES[data.state] || STATE_STYLES.unchanged;
    const isRemoved = data.state === 'removed';

    // Split "db:insert" → namespace="db", localName="insert"
    const parts = (data.type || '').split(':');
    const hasNs = parts.length === 2;
    const ns = hasNs ? parts[0] : null;
    const localName = hasNs ? parts[1] : parts[0];
    const nsColor = (ns && NS_COLORS[ns]) || '#57606a';

    const isFlowRef = data.type === 'flow-ref';
    const flowRefTarget = isFlowRef ? (data.attributes?.['@_name'] || data.label) : null;

    return (
        <div style={{
            background: style.bg,
            border: `2px ${isRemoved ? 'dashed' : 'solid'} ${style.border}`,
            borderRadius: '8px',
            padding: '8px 10px',
            minWidth: '180px',
            maxWidth: '220px',
            opacity: isRemoved ? 0.75 : 1,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            boxShadow: isFlowRef ? `0 0 0 2px #8250df40, 0 2px 6px rgba(0,0,0,0.10)` : '0 2px 6px rgba(0,0,0,0.10)',
            position: 'relative',
        }}>
            <Handle type="target" position={Position.Left} style={{ background: '#888', width: 8, height: 8 }} />

            {/* State badge */}
            <span style={{
                position: 'absolute', top: 6, right: 8,
                background: style.badge, color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 11, fontWeight: 700, lineHeight: '16px',
                textAlign: 'center', display: 'inline-block',
            }}>{style.badgeText}</span>

            {isFlowRef ? (
                // flow-ref: show as a call badge
                <>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: '#8250df20', color: '#8250df',
                        borderRadius: '4px', padding: '0 6px',
                        fontSize: 10, fontWeight: 700, marginBottom: 4,
                        letterSpacing: '0.5px', textTransform: 'uppercase',
                    }}>⤵ flow-ref</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8250df', lineHeight: 1.3, wordBreak: 'break-all' }}>
                        {flowRefTarget}
                    </div>
                </>
            ) : (
                <>
                    {/* Namespace chip */}
                    {ns && (
                        <div style={{
                            display: 'inline-block',
                            background: nsColor + '20', color: nsColor,
                            borderRadius: '4px', padding: '0 5px',
                            fontSize: 10, fontWeight: 600, marginBottom: 4,
                            letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>{ns}</div>
                    )}

                    {/* Local element name */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#24292f', lineHeight: 1.3 }}>
                        {localName}
                    </div>

                    {/* doc:name label */}
                    {data.label && data.label !== data.type && (
                        <div style={{ fontSize: 11, color: '#57606a', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {data.label}
                        </div>
                    )}
                </>
            )}

            <Handle type="source" position={Position.Right} style={{ background: '#888', width: 8, height: 8 }} />
        </div>
    );
}
