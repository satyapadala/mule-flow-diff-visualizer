// popup.ts — runs inside popup.html
// Detects the current tab URL and offers the right action

type PageContext =
  | { type: 'pr-diff'; owner: string; repo: string; prNumber: string; host: string }
  | { type: 'blob-xml'; owner: string; repo: string; ref: string; filePath: string; host: string }
  | { type: 'blob-non-xml' }
  | { type: 'non-github' };

function detectContext(url: string): PageContext {
  try {
    const parsed = new URL(url);
    const host = parsed.host;
    const parts = parsed.pathname.split('/').filter(Boolean);

    // PR diff: /owner/repo/pull/123[/files]
    if (parts.length >= 4 && parts[2] === 'pull') {
      return { type: 'pr-diff', owner: parts[0], repo: parts[1], prNumber: parts[3], host };
    }

    // Blob view: /owner/repo/blob/ref/path/to/file.xml
    if (parts.length >= 5 && parts[2] === 'blob') {
      const filePath = parts.slice(4).join('/');
      if (filePath.toLowerCase().endsWith('.xml')) {
        return { type: 'blob-xml', owner: parts[0], repo: parts[1], ref: parts[3], filePath, host };
      }
      return { type: 'blob-non-xml' };
    }

    return { type: 'non-github' };
  } catch {
    return { type: 'non-github' };
  }
}

const pageInfoEl = document.getElementById('page-info')!;
const btnVisualize = document.getElementById('btn-visualize') as HTMLButtonElement;
const btnDocs = document.getElementById('btn-open-docs') as HTMLButtonElement;

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url) {
    pageInfoEl.textContent = 'Cannot read current tab URL.';
    pageInfoEl.classList.add('muted');
    return;
  }

  const ctx = detectContext(tab.url);

  if (ctx.type === 'pr-diff') {
    pageInfoEl.innerHTML = `PR #${ctx.prNumber} on <strong>${ctx.owner}/${ctx.repo}</strong><br/><span style="font-size:10px;color:#7d8590">Click any "👁 Visual Flow" button in the diff below</span>`;
    btnVisualize.textContent = '👁 Visualize All XML Files';
    btnVisualize.disabled = false;
    btnVisualize.addEventListener('click', () => {
      chrome.tabs.sendMessage(tab.id!, { type: 'TRIGGER_ALL_VISUAL_FLOWS' });
      window.close();
    });

  } else if (ctx.type === 'blob-xml') {
    pageInfoEl.innerHTML = `<strong>${ctx.filePath}</strong><br/><span style="font-size:10px;color:#7d8590">${ctx.owner}/${ctx.repo} @ ${ctx.ref}</span>`;
    btnVisualize.textContent = '👁 Open Flow Diagram';
    btnVisualize.disabled = false;
    btnDocs.style.display = 'block';

    btnVisualize.addEventListener('click', () => {
      // Open our full-screen viewer with the file details as URL params
      const viewerUrl = chrome.runtime.getURL('index.html') +
        `?host=${encodeURIComponent(ctx.host)}` +
        `&owner=${encodeURIComponent(ctx.owner)}` +
        `&repo=${encodeURIComponent(ctx.repo)}` +
        `&ref=${encodeURIComponent(ctx.ref)}` +
        `&filePath=${encodeURIComponent(ctx.filePath)}`;
      chrome.tabs.create({ url: viewerUrl });
      window.close();
    });

    btnDocs.addEventListener('click', () => {
      const rawUrl = `https://${ctx.host}/${ctx.owner}/${ctx.repo}/raw/${ctx.ref}/${ctx.filePath}`;
      chrome.tabs.create({ url: rawUrl });
      window.close();
    });

  } else if (ctx.type === 'blob-non-xml') {
    pageInfoEl.textContent = 'Not a .xml file. Navigate to a Mule XML file or PR diff.';
    pageInfoEl.classList.add('muted');

  } else {
    pageInfoEl.textContent = 'Open a GitHub PR diff or a Mule XML blob page.';
    pageInfoEl.classList.add('muted');
  }
});
