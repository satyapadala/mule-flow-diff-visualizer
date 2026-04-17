import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ContextHint } from '../parser';

// ── Category System (shared with ViewNode) ────────────────────────────────────
type Category = {
  bg: string;
  border: string;
  text: string;
  subtleText: string;
  icon: string;
  tag: string;
};

const CATEGORIES: Record<string, Category> = {
  flow:                { bg: 'linear-gradient(135deg,#1f6feb,#388bfd)', border: '#0550ae', text: '#fff', subtleText: 'rgba(255,255,255,0.75)', icon: '🌊', tag: 'Flow' },
  'sub-flow':          { bg: 'linear-gradient(135deg,#6e40c9,#8250df)', border: '#5a32a3', text: '#fff', subtleText: 'rgba(255,255,255,0.75)', icon: '↩',  tag: 'Sub-Flow' },
  'flow-ref':          { bg: '#f0eeff', border: '#8250df', text: '#6e40c9', subtleText: '#8250df', icon: '⤵', tag: 'Flow Ref' },
  http:                { bg: '#dff2ff', border: '#0969da', text: '#0550ae', subtleText: '#57606a', icon: '🌐', tag: 'HTTP' },
  ee:                  { bg: '#f0eeff', border: '#8250df', text: '#6e40c9', subtleText: '#57606a', icon: '⚡', tag: 'DataWeave' },
  db:                  { bg: '#e6ffec', border: '#1a7f37', text: '#116329', subtleText: '#57606a', icon: '💾', tag: 'Database' },
  amqp:                { bg: '#fff3e0', border: '#db6d28', text: '#953800', subtleText: '#57606a', icon: '📨', tag: 'AMQP' },
  jms:                 { bg: '#fff3e0', border: '#db6d28', text: '#953800', subtleText: '#57606a', icon: '📨', tag: 'JMS' },
  kafka:               { bg: '#fff3e0', border: '#db6d28', text: '#953800', subtleText: '#57606a', icon: '📬', tag: 'Kafka' },
  vm:                  { bg: '#f0eeff', border: '#6e40c9', text: '#5a32a3', subtleText: '#57606a', icon: '📫', tag: 'VM Queue' },
  file:                { bg: '#e0f7f5', border: '#0c776d', text: '#0b5045', subtleText: '#57606a', icon: '📁', tag: 'File' },
  sftp:                { bg: '#e0f7f5', border: '#0c776d', text: '#0b5045', subtleText: '#57606a', icon: '📂', tag: 'SFTP' },
  ftp:                 { bg: '#e0f7f5', border: '#0c776d', text: '#0b5045', subtleText: '#57606a', icon: '📂', tag: 'FTP' },
  s3:                  { bg: '#fff3e0', border: '#cf6c00', text: '#8a4400', subtleText: '#57606a', icon: '☁️', tag: 'AWS S3' },
  sqs:                 { bg: '#fff3e0', border: '#cf6c00', text: '#8a4400', subtleText: '#57606a', icon: '☁️', tag: 'AWS SQS' },
  logger:              { bg: '#f6f8fa', border: '#8c959f', text: '#57606a', subtleText: '#8c959f', icon: '📝', tag: 'Logger' },
  foreach:             { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '🔁', tag: 'For Each' },
  choice:              { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '🔀', tag: 'Router' },
  'parallel-foreach':  { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '🔁', tag: 'Parallel For Each' },
  'scatter-gather':    { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '🔄', tag: 'Scatter-Gather' },
  'round-robin':       { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '🔄', tag: 'Round Robin' },
  'first-successful':  { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '✅', tag: 'First Successful' },
  when:                { bg: '#fffbdd', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '❓', tag: 'When' },
  otherwise:           { bg: '#fffbdd', border: '#8c959f', text: '#57606a', subtleText: '#8c959f', icon: '↔', tag: 'Otherwise' },
  try:                 { bg: '#ffebe9', border: '#cf222e', text: '#a40e26', subtleText: '#57606a', icon: '🛡️', tag: 'Try' },
  'error-handler':     { bg: '#ffebe9', border: '#cf222e', text: '#a40e26', subtleText: '#57606a', icon: '⚠️', tag: 'Error Handler' },
  'on-error-continue': { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '▶⚠', tag: 'On Error Continue' },
  'on-error-propagate':{ bg: '#ffebe9', border: '#cf222e', text: '#a40e26', subtleText: '#57606a', icon: '⬆⚠', tag: 'On Error Propagate' },
  async:               { bg: '#f0eeff', border: '#6e40c9', text: '#5a32a3', subtleText: '#57606a', icon: '⚡', tag: 'Async' },
  'until-successful':  { bg: '#fff8c5', border: '#d4a72c', text: '#7d4e00', subtleText: '#57606a', icon: '🔄', tag: 'Until Successful' },
  'set-variable':      { bg: '#f6f8fa', border: '#8c959f', text: '#57606a', subtleText: '#8c959f', icon: '📌', tag: 'Set Variable' },
  'set-payload':       { bg: '#f6f8fa', border: '#8c959f', text: '#57606a', subtleText: '#8c959f', icon: '📦', tag: 'Set Payload' },
  config:              { bg: '#f6f8fa', border: '#d0d7de', text: '#57606a', subtleText: '#8c959f', icon: '⚙️', tag: 'Config' },
  mule:                { bg: '#f6f8fa', border: '#d0d7de', text: '#57606a', subtleText: '#8c959f', icon: '🔧', tag: 'Mule' },
};

const FALLBACK_CAT: Category = { bg: '#f6f8fa', border: '#d0d7de', text: '#24292f', subtleText: '#57606a', icon: '⚙️', tag: '' };

function resolveCategory(type: string): Category {
  if (CATEGORIES[type]) return CATEGORIES[type];
  const ns = type.split(':')[0];
  if (CATEGORIES[ns]) return CATEGORIES[ns];
  if (type.toLowerCase().includes('config')) return CATEGORIES.config;
  return FALLBACK_CAT;
}

// ── Diff state overlays ───────────────────────────────────────────────────────
const DIFF_STRIPE: Record<string, { color: string; label: string; opacity?: number; dashBorder?: boolean }> = {
  added:     { color: '#2ea043', label: '+  Added' },
  removed:   { color: '#cf222e', label: '−  Removed', opacity: 0.7, dashBorder: true },
  modified:  { color: '#d4a72c', label: '~  Modified' },
  unchanged: { color: 'transparent', label: '' },
};

// ── Hint rendering ────────────────────────────────────────────────────────────
function HintRow({ hint, isDark }: { hint: ContextHint; isDark: boolean }) {
  const textColor = isDark ? 'rgba(255,255,255,0.65)' : '#57606a';
  const keyColor  = isDark ? 'rgba(255,255,255,0.4)'  : '#8c959f';
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start', marginTop: 2, lineHeight: 1.3 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: keyColor, textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0, paddingTop: 1 }}>
        {hint.key}
      </span>
      <span style={{ fontSize: 10, color: textColor, wordBreak: 'break-all', fontFamily: hint.key === 'sql' || hint.key === 'when' || hint.key === 'msg' ? 'monospace' : 'inherit' }}>
        {hint.value}
      </span>
    </div>
  );
}

// ── FlowNode Component ────────────────────────────────────────────────────────
export type FlowNodeMode = 'view' | 'diff';

export function FlowNode({ data }: NodeProps) {
  const type: string  = data.type || '';
  const mode: FlowNodeMode = data.mode || 'view';
  const state: string = data.state || 'unchanged';
  const hints: ContextHint[] = data.contextHints || [];
  const expanded: boolean   = data.expanded ?? false;
  const onToggle: ((id: string) => void) | undefined = data.onToggle;
  const nodeId: string = data.nodeId || '';

  const cat        = resolveCategory(type);
  const diff       = DIFF_STRIPE[state] || DIFF_STRIPE.unchanged;
  const isFlowHeader = type === 'flow' || type === 'sub-flow';
  const isConfig     = !isFlowHeader && (type.toLowerCase().includes('config') || type === 'mule');
  const isFlowRef    = type === 'flow-ref';
  const isDarkBg     = isFlowHeader;
  const isRemoved    = state === 'removed';
  const showDiff     = mode === 'diff' && state !== 'unchanged';
  const inlinedFrom: string | undefined = data.inlinedFromFlow;
  const isFirstInlined: boolean = data.isFirstInlined ?? false;

  const local  = type.includes(':') ? type.split(':').pop()! : type;
  const docName = (!isFlowRef && data.label && data.label !== type) ? data.label : null;
  const flowRefTarget = isFlowRef ? (data.attributes?.['@_name'] || data.label) : null;
  const stepCount: number = data.stepCount ?? 0;

  const cardStyle: React.CSSProperties = {
    background: cat.bg,
    border: `2px ${(isRemoved && showDiff) ? 'dashed' : 'solid'} ${showDiff ? diff.color : cat.border}`,
    borderRadius: isFlowHeader ? '10px' : '8px',
    padding: isFlowHeader ? '10px 14px' : isConfig ? '5px 10px' : '8px 12px',
    minWidth: isFlowHeader ? '260px' : isConfig ? '140px' : '180px',
    maxWidth: isFlowHeader ? '340px' : '220px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxShadow: showDiff
      ? `0 0 0 3px ${diff.color}30, 0 3px 10px rgba(0,0,0,0.12)`
      : inlinedFrom
      ? '0 0 0 1.5px #0c776d40, 0 2px 6px rgba(0,0,0,0.08)'
      : isFlowHeader ? '0 4px 14px rgba(0,0,0,0.18)' : '0 2px 6px rgba(0,0,0,0.08)',
    position: 'relative',
    opacity: (isRemoved && showDiff) ? 0.72 : 1,
    borderLeft: isFlowHeader ? undefined : `4px solid ${showDiff ? diff.color : inlinedFrom ? '#0c776d' : cat.border}`,
    transition: 'box-shadow 0.2s',
  };

  return (
    <div style={cardStyle}>
      {!isFlowHeader && <Handle type="target" position={Position.Left} style={{ background: cat.border, width: 8, height: 8, left: -6 }} />}

      {/* ── Inlined-from badge (shown instead of / above diff banner) ── */}
      {inlinedFrom && !showDiff && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: '#0c776d',
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.5px',
          textAlign: 'center',
          padding: '1px 0',
          borderRadius: isFlowHeader ? '8px 8px 0 0' : '6px 6px 0 0',
          pointerEvents: 'none',
        }}>
          ↩ {inlinedFrom}
        </div>
      )}

      {/* ── Diff banner strip (top of card) ── */}
      {showDiff && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          background: diff.color,
          color: '#fff',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.5px',
          textAlign: 'center',
          padding: '1px 0',
          borderRadius: isFlowHeader ? '8px 8px 0 0' : '6px 6px 0 0',
          pointerEvents: 'none',
        }}>
          {diff.label}
        </div>
      )}

      {/* ── Node Body ── */}
      <div style={{ marginTop: showDiff ? 10 : 0 }}>
        {isFlowHeader ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{cat.icon}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: cat.subtleText, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
                {cat.tag}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: cat.text, lineHeight: 1.3, wordBreak: 'break-all' }}>
                {data.label || local}
              </div>
            </div>
          </div>
        ) : isConfig ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>{cat.icon}</span>
            <div>
              <div style={{ fontSize: 9, color: cat.subtleText, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{cat.tag || local}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: cat.text }}>{data.attributes?.['@_name'] || docName || local}</div>
            </div>
          </div>
        ) : isFlowRef ? (
          // ── flow-ref: collapsible call node ──────────────────────────────────
          <div style={{ cursor: onToggle ? 'pointer' : 'default' }}
               onClick={() => onToggle && onToggle(nodeId)}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cat.border + '20', color: cat.border, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              {cat.icon} {cat.tag}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: cat.text, flex: 1 }}>{flowRefTarget}</div>
              {onToggle && (
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: '#fff', background: cat.border,
                  borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, cursor: 'pointer',
                }}>
                  {expanded ? '−' : '+'}
                </span>
              )}
            </div>
            {stepCount > 0 && !expanded && (
              <div style={{ fontSize: 9, color: cat.subtleText, marginTop: 2 }}>
                {stepCount} step{stepCount !== 1 ? 's' : ''} · click to expand
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: (hints.length || docName) ? 3 : 0 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{cat.icon}</span>
              <div>
                {cat.tag && <div style={{ fontSize: 9, color: cat.subtleText, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, lineHeight: 1 }}>{cat.tag}</div>}
                <div style={{ fontSize: 12, fontWeight: 600, color: cat.text, lineHeight: 1.2 }}>{local}</div>
              </div>
            </div>
            {docName && (
              <div style={{ fontSize: 11, color: '#57606a', paddingLeft: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: hints.length ? 3 : 0 }}>
                {docName}
              </div>
            )}
            {/* ── Context Hints ── */}
            {hints.length > 0 && (
              <div style={{
                borderTop: `1px solid ${cat.border}30`,
                marginTop: 4, paddingTop: 4,
                paddingLeft: 2,
              }}>
                {hints.map((h, i) => <HintRow key={i} hint={h} isDark={isDarkBg} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {!isFlowHeader && <Handle type="source" position={Position.Right} style={{ background: cat.border, width: 8, height: 8, right: -6 }} />}
      {isFlowHeader && <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.6)', width: 8, height: 8 }} />}
    </div>
  );
}
