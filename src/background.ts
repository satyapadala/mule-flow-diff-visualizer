import { loadLlmConfig } from './llm';

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  const url = details.url;

  // GitHub PR pages
  if (url.includes('/pull/')) {
    setTimeout(() => {
      chrome.tabs.sendMessage(details.tabId, {
        type: 'GITHUB_NAVIGATION',
        url,
      }).catch(() => {});
    }, 1000);
    return;
  }

  // Sourcegraph blob views (SPA navigation)
  const hostname = new URL(url).hostname;
  const isSG = hostname.includes('sourcegraph') || hostname.startsWith('sg.');
  if (isSG && url.includes('/-/blob/')) {
    setTimeout(() => {
      chrome.tabs.sendMessage(details.tabId, {
        type: 'SG_NAVIGATION',
        url,
      }).catch(() => {});
    }, 1000);
  }
});

function extractAssistantText(payload: any): string {
  if (typeof payload?.choices?.[0]?.message?.content === 'string') {
    return payload.choices[0].message.content;
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (typeof item?.text === 'string') return item.text;
        return '';
      })
      .join('\n')
      .trim();
  }

  if (typeof payload?.output_text === 'string') {
    return payload.output_text;
  }

  return '';
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'AI_CHAT_REQUEST') return;

  (async () => {
    try {
      const config = await loadLlmConfig();
      if (!config.endpoint || !config.model || !config.apiKey) {
        throw new Error('LLM config is incomplete. Open the extension settings and add endpoint, model, and API key.');
      }

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: config.systemPrompt },
            ...(Array.isArray(message.messages) ? message.messages : []),
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM request failed (${response.status}): ${errorText.slice(0, 300)}`);
      }

      const payload = await response.json();
      const content = extractAssistantText(payload);
      if (!content) {
        throw new Error('LLM response did not include assistant content.');
      }

      sendResponse({ ok: true, content });
    } catch (error: any) {
      sendResponse({ ok: false, error: error?.message || 'Unknown AI request error' });
    }
  })();

  return true;
});

console.log('MuleFlow Diff Visualizer: Background script loaded.');
