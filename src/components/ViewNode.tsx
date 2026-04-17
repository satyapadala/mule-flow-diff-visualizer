import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

// ── Category System ───────────────────────────────────────────────────────────
type Category = {
  bg: string;
  border: string;
  text: string;
  labelColor: string;
  icon: string;
  tag: string;  // human-readable category label
};

const CATEGORIES: Record<string, Category> = {
  flow: {
    bg: 'linear-gradient(135deg, #1f6feb 0%, #388bfd 100%)',
    border: '#0550ae',
    text: '#ffffff',
    labelColor: 'rgba(255,255,255,0.75)',
    icon: '🌊',
    tag: 'Flow',
  },
  'sub-flow': {
    bg: 'linear-gradient(135deg, #6e40c9 0%, #8250df 100%)',
    border: '#5a32a3',
    text: '#ffffff',
    labelColor: 'rgba(255,255,255,0.75)',
    icon: '↩',
    tag: 'Sub-Flow',
  },
  'flow-ref': {
    bg: '#f0eeff',
    border: '#8250df',
    text: '#6e40c9',
    labelColor: '#8250df',
    icon: '⤵',
    tag: 'Flow Ref',
  },
  http: {
    bg: '#dff2ff',
    border: '#0969da',
    text: '#0550ae',
    labelColor: '#57606a',
    icon: '🌐',
    tag: 'HTTP',
  },
  ee: {
    bg: '#f0eeff',
    border: '#8250df',
    text: '#6e40c9',
    labelColor: '#57606a',
    icon: '⚡',
    tag: 'DataWeave',
  },
  db: {
    bg: '#e6ffec',
    border: '#1a7f37',
    text: '#116329',
    labelColor: '#57606a',
    icon: '💾',
    tag: 'Database',
  },
  amqp: {
    bg: '#fff3e0',
    border: '#db6d28',
    text: '#953800',
    labelColor: '#57606a',
    icon: '📨',
    tag: 'AMQP',
  },
  jms: {
    bg: '#fff3e0',
    border: '#db6d28',
    text: '#953800',
    labelColor: '#57606a',
    icon: '📨',
    tag: 'JMS',
  },
  kafka: {
    bg: '#fff3e0',
    border: '#db6d28',
    text: '#953800',
    labelColor: '#57606a',
    icon: '📬',
    tag: 'Kafka',
  },
  vm: {
    bg: '#f0eeff',
    border: '#6e40c9',
    text: '#5a32a3',
    labelColor: '#57606a',
    icon: '📫',
    tag: 'VM Queue',
  },
  file: {
    bg: '#e0f7f5',
    border: '#0c776d',
    text: '#0b5045',
    labelColor: '#57606a',
    icon: '📁',
    tag: 'File',
  },
  sftp: {
    bg: '#e0f7f5',
    border: '#0c776d',
    text: '#0b5045',
    labelColor: '#57606a',
    icon: '📂',
    tag: 'SFTP',
  },
  ftp: {
    bg: '#e0f7f5',
    border: '#0c776d',
    text: '#0b5045',
    labelColor: '#57606a',
    icon: '📂',
    tag: 'FTP',
  },
  s3: {
    bg: '#fff3e0',
    border: '#cf6c00',
    text: '#8a4400',
    labelColor: '#57606a',
    icon: '☁️',
    tag: 'AWS S3',
  },
  sqs: {
    bg: '#fff3e0',
    border: '#cf6c00',
    text: '#8a4400',
    labelColor: '#57606a',
    icon: '☁️',
    tag: 'AWS SQS',
  },
  logger: {
    bg: '#f6f8fa',
    border: '#8c959f',
    text: '#57606a',
    labelColor: '#8c959f',
    icon: '📝',
    tag: 'Logger',
  },
  foreach: {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '🔁',
    tag: 'For Each',
  },
  choice: {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '🔀',
    tag: 'Router',
  },
  'parallel-foreach': {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '⚡🔁',
    tag: 'Parallel For Each',
  },
  'scatter-gather': {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '🔄',
    tag: 'Scatter-Gather',
  },
  'round-robin': {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '🔄',
    tag: 'Round Robin',
  },
  'first-successful': {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '✅',
    tag: 'First Successful',
  },
  try: {
    bg: '#ffebe9',
    border: '#cf222e',
    text: '#a40e26',
    labelColor: '#57606a',
    icon: '🛡️',
    tag: 'Try',
  },
  'error-handler': {
    bg: '#ffebe9',
    border: '#cf222e',
    text: '#a40e26',
    labelColor: '#57606a',
    icon: '⚠️',
    tag: 'Error Handler',
  },
  'on-error-continue': {
    bg: '#ffebe9',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '▶️⚠️',
    tag: 'On Error Continue',
  },
  'on-error-propagate': {
    bg: '#ffebe9',
    border: '#cf222e',
    text: '#a40e26',
    labelColor: '#57606a',
    icon: '⬆️⚠️',
    tag: 'On Error Propagate',
  },
  async: {
    bg: '#f0eeff',
    border: '#6e40c9',
    text: '#5a32a3',
    labelColor: '#57606a',
    icon: '⚡',
    tag: 'Async',
  },
  'until-successful': {
    bg: '#fff8c5',
    border: '#d4a72c',
    text: '#7d4e00',
    labelColor: '#57606a',
    icon: '🔄✅',
    tag: 'Until Successful',
  },
  config: {
    bg: '#f6f8fa',
    border: '#d0d7de',
    text: '#57606a',
    labelColor: '#8c959f',
    icon: '⚙️',
    tag: 'Config',
  },
};

function resolveCategory(type: string): Category {
  // Direct match (flow, sub-flow, logger, foreach, choice, etc.)
  if (CATEGORIES[type]) return CATEGORIES[type];

  // Namespace match: "db:insert" → "db"
  const ns = type.split(':')[0];
  if (CATEGORIES[ns]) return CATEGORIES[ns];

  // Config detection
  if (type.includes('config') || type.includes('Config')) return CATEGORIES.config;

  // Fallback
  return {
    bg: '#f6f8fa', border: '#d0d7de',
    text: '#24292f', labelColor: '#57606a',
    icon: '⚙️', tag: '',
  };
}

// ── ViewNode Component ────────────────────────────────────────────────────────
export function ViewNode({ data }: NodeProps) {
  const type: string = data.type || '';
  const cat = resolveCategory(type);
  const isFlowHeader = type === 'flow' || type === 'sub-flow';
  const isConfig = type.includes('config') || type.includes('Config');
  const isFlowRef = type === 'flow-ref';

  const localName = type.includes(':') ? type.split(':').pop()! : type;
  const targetName = isFlowRef ? (data.attributes?.['@_name'] || data.label) : null;
  const docName = (!isFlowRef && data.label && data.label !== type) ? data.label : null;

  const isGradient = isFlowHeader;

  return (
    <div style={{
      background: cat.bg,
      border: `2px solid ${cat.border}`,
      borderRadius: isFlowHeader ? '10px' : '8px',
      padding: isFlowHeader ? '10px 14px' : isConfig ? '5px 10px' : '8px 12px',
      minWidth: isFlowHeader ? '260px' : isConfig ? '140px' : '180px',
      maxWidth: isFlowHeader ? '340px' : '220px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxShadow: isFlowHeader
        ? '0 4px 14px rgba(0,0,0,0.18)'
        : '0 2px 6px rgba(0,0,0,0.08)',
      position: 'relative',
      borderLeft: isFlowHeader ? undefined : `4px solid ${cat.border}`,
    }}>
      {!isFlowHeader && <Handle type="target" position={Position.Left} style={{ background: cat.border, width: 8, height: 8, left: -6 }} />}

      {isFlowHeader ? (
        /* ── Flow / Sub-flow Header ─────────────────────── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{cat.icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: cat.labelColor, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
              {cat.tag}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: cat.text, lineHeight: 1.3, wordBreak: 'break-all' }}>
              {data.label || localName}
            </div>
          </div>
        </div>
      ) : isConfig ? (
        /* ── Config Pill ───────────────────────────────────── */
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>{cat.icon}</span>
          <div>
            <div style={{ fontSize: 9, color: cat.labelColor, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{cat.tag || localName}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: cat.text }}>{data.attributes?.['@_name'] || docName || localName}</div>
          </div>
        </div>
      ) : isFlowRef ? (
        /* ── Flow Ref ──────────────────────────────────────── */
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: cat.border + '20', color: cat.border, borderRadius: 4, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            {cat.icon} {cat.tag}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: cat.text }}>{targetName}</div>
        </div>
      ) : (
        /* ── Regular Processor ─────────────────────────────── */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: docName ? 3 : 0 }}>
            <span style={{ fontSize: 14 }}>{cat.icon}</span>
            <div>
              {cat.tag && <div style={{ fontSize: 9, color: cat.labelColor, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, lineHeight: 1 }}>{cat.tag}</div>}
              <div style={{ fontSize: 12, fontWeight: 600, color: cat.text, lineHeight: 1.2 }}>{localName}</div>
            </div>
          </div>
          {docName && (
            <div style={{ fontSize: 11, color: '#57606a', paddingLeft: 19, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {docName}
            </div>
          )}
        </div>
      )}

      {!isFlowHeader && <Handle type="source" position={Position.Right} style={{ background: cat.border, width: 8, height: 8, right: -6 }} />}
      {isFlowHeader && <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.6)', width: 8, height: 8 }} />}
    </div>
  );
}
