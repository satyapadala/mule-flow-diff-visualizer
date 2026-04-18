import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AiChatPanelProps = {
  filePath: string;
  baseXml: string;
  headXml: string;
  diffSummary: string;
};

function buildContextMessage(filePath: string, baseXml: string, headXml: string, diffSummary: string) {
  return [
    `File: ${filePath}`,
    '',
    'Flow diff summary:',
    diffSummary || 'No parsed diff summary available.',
    '',
    'Old XML:',
    baseXml || '(empty)',
    '',
    'New XML:',
    headXml || '(empty)',
  ].join('\n');
}

export function AiChatPanel({ filePath, baseXml, headXml, diffSummary }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Ask about behavior changes, risk, impacted flows, or what to review before approving.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const contextMessage = useMemo(
    () => buildContextMessage(filePath, baseXml, headXml, diffSummary),
    [filePath, baseXml, headXml, diffSummary],
  );

  const submit = async () => {
    const question = draft.trim();
    if (!question || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    setError('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_CHAT_REQUEST',
        messages: [
          { role: 'user', content: contextMessage },
          ...nextMessages,
        ],
      });

      if (!response?.ok) {
        throw new Error(response?.error || 'Unknown AI request failure');
      }

      setMessages([...nextMessages, { role: 'assistant', content: response.content }]);
    } catch (requestError: any) {
      setError(requestError?.message || 'AI request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: 360,
      borderLeft: '1px solid #d0d7de',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 320,
      maxWidth: 420,
    }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #d0d7de', background: '#f6f8fa' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#24292f' }}>AI Reviewer</div>
        <div style={{ fontSize: 11, color: '#57606a', marginTop: 4, lineHeight: 1.4 }}>
          Uses old XML, new XML, and parsed diff context from this visual flow.
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} style={{
            alignSelf: message.role === 'user' ? 'flex-end' : 'stretch',
            background: message.role === 'user' ? '#ddf4ff' : '#f6f8fa',
            color: '#24292f',
            border: `1px solid ${message.role === 'user' ? '#54aeff' : '#d0d7de'}`,
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}>
            {message.role === 'assistant' ? (
              <div style={{ fontSize: 12, color: '#24292f' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.6 }}>{children}</p>,
                    ul: ({ children }) => <ul style={{ margin: '0 0 8px 18px', padding: 0 }}>{children}</ul>,
                    ol: ({ children }) => <ol style={{ margin: '0 0 8px 18px', padding: 0 }}>{children}</ol>,
                    li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
                    code: ({ children }) => (
                      <code style={{
                        background: '#eaeef2',
                        borderRadius: 4,
                        padding: '1px 4px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 11,
                      }}>
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre style={{
                        margin: '0 0 8px',
                        background: '#0d1117',
                        color: '#e6edf3',
                        borderRadius: 8,
                        padding: '10px 12px',
                        overflowX: 'auto',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 11,
                        whiteSpace: 'pre',
                      }}>
                        {children}
                      </pre>
                    ),
                    strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer" style={{ color: '#0969da' }}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: 12, color: '#57606a' }}>Thinking through the flow diff...</div>
        )}
        {error && (
          <div style={{ fontSize: 12, color: '#cf222e' }}>{error}</div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #d0d7de', background: '#f6f8fa' }}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyUp={(event) => {
            event.stopPropagation();
          }}
          onKeyPress={(event) => {
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          onFocus={(event) => {
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
          placeholder="Ask what changed, what is risky, or what to test..."
          style={{
            width: '100%',
            minHeight: 88,
            resize: 'vertical',
            borderRadius: 8,
            border: '1px solid #d0d7de',
            padding: '10px 12px',
            font: 'inherit',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 11, color: '#57606a' }}>Enter to send, Shift+Enter for newline</div>
          <button
            onClick={submit}
            disabled={loading || !draft.trim()}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              background: loading || !draft.trim() ? '#8c959f' : '#1f6feb',
              color: '#fff',
              fontWeight: 700,
              cursor: loading || !draft.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            Ask AI
          </button>
        </div>
      </div>
    </div>
  );
}
