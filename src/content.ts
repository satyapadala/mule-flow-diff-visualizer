import { extractXmlFromDiff } from './extractor';
import { fetchCompleteXmlFiles } from './githubApi';
import { parseGraphDiff } from './parser';
import { injectShadowRootAndRender } from './components/injectShadowRoot';

console.log('MuleFlow Diff Visualizer: Content script active. TextScanner Mode.');
console.log('MuleFlow: Note - any ERR_BLOCKED_BY_CLIENT errors for collector.github.com are from your AdBlocker/Browser, NOT this extension.');

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function injectVisualToggle() {
    // Guard: Only run on GitHub PR diff pages (works for github.com AND GitHub Enterprise)
    if (!window.location.pathname.includes('/pull/')) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const textNodes: Node[] = [];
    
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const text = (node.nodeValue || '').trim().toLowerCase();
        
        if (text.endsWith('.xml') && text.split(' ').length === 1 && text.length < 150) {
            textNodes.push(node);
        }
    }

    if (textNodes.length === 0) return;

    textNodes.forEach(node => {
        const parent = node.parentElement;
        if (!parent) return;
        
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE'].includes(parent.tagName)) return;
        
        // Anti-Double Injection: check if the exact sibling is already our button
        if (node.nextSibling && (node.nextSibling as Element).classList?.contains('mule-flow-toggle')) return;
        if (node.previousSibling && (node.previousSibling as Element).classList?.contains('mule-flow-toggle')) return;

        if (parent.closest('.muleflow-injected-container')) return;

        const pathText = (node.nodeValue || '').trim();
        console.log(`MuleFlow: Found physical XML text node: "${pathText}"`);

        const toggleButton = document.createElement('button');
        toggleButton.className = 'mule-flow-toggle';
        toggleButton.textContent = '👁 Visual Flow';
        toggleButton.style.cssText = `
          background: #2ea44f; 
          color: white !important; 
          margin-left: 10px; 
          font-weight: 600; 
          border-radius: 6px; 
          padding: 2px 8px; 
          cursor: pointer; 
          border: 1px solid rgba(27,31,35,0.15); 
          font-size: 12px; 
          display: inline-flex; 
          align-items: center;
          vertical-align: middle; 
          z-index: 10;
        `;

        toggleButton.onclick = async (e) => {
          e.preventDefault(); 
          e.stopPropagation();
          
          try {
              toggleButton.textContent = '⏳ Downloading XML...';
              toggleButton.style.opacity = '0.7';

              let baseXml = '';
              let headXml = '';

              try {
                  // Attempt to cleanly fetch the 100% complete files via git raw endpoints
                  const result = await fetchCompleteXmlFiles(window.location.href, pathText);
                  baseXml = result.baseXml;
                  headXml = result.headXml;
              } catch (apiErr) {
                  console.warn('MuleFlow: API fetch failed, falling back to DOM extraction.', apiErr);
                  const fallback = extractXmlFromDiff(toggleButton);
                  baseXml = fallback.baseXml;
                  headXml = fallback.headXml;
              }
              
              console.log('MuleFlow: Extracted Base XML Length:', baseXml.length);
              console.log('MuleFlow: Extracted Head XML Length:', headXml.length);
              
              toggleButton.textContent = '⏳ Parsing Configs...';

              // Parse synchronously directly in the content script (fast enough for XML parsing, bypasses Github CSP limits on blob workers)
              parseGraphDiff({
                  baseXml,
                  headXml,
                  filePath: pathText,
              }).then(({ nodes, edges, error }) => {
                  if (error) {
                      console.error('MuleFlow Parser Engine Error:', error);
                      alert('Parser Error: ' + error);
                      toggleButton.textContent = '❌ Parser Error';
                      return;
                  }
                  
                  console.log('MuleFlow: Received successful AST parsing from engine!', { nodes, edges });
                  toggleButton.textContent = `✅ Visual Flow`;
                  toggleButton.style.opacity = '1';
                  
                  const fileContainerElement = toggleButton.closest('[id^="diff-"], .js-file, [data-details-container-group="file"]') as HTMLElement;
                  if (fileContainerElement) {
                      injectShadowRootAndRender(fileContainerElement, pathText, nodes, edges);
                  } else {
                      alert('Could not locate file container for graph injection!');
                  }
              }).catch(err => {
                  console.error('MuleFlow Engine Error:', err);
                  toggleButton.textContent = '❌ Engine Error';
              });

          } catch(err) {
              console.error('MuleFlow Extraction Error:', err);
              alert(`MuleFlow Extraction Error: ${err}`);
              toggleButton.textContent = '👁 Visual Flow';
          }
        };

        if (node.nextSibling) {
            parent.insertBefore(toggleButton, node.nextSibling);
        } else {
            parent.appendChild(toggleButton);
        }

        let ancestor: HTMLElement | null = parent;
        for (let i = 0; i < 5; i++) {
            if (ancestor && ancestor !== document.body) {
                ancestor.classList.add('muleflow-injected-container');
                ancestor = ancestor.parentElement;
            }
        }
        console.log(`MuleFlow: INJECTED button next to "${pathText}"!`);
    });
}

const debouncedInject = debounce(() => {
    observer.disconnect();
    injectVisualToggle();
    observer.observe(document.body, { childList: true, subtree: true });
}, 150);

const observer = new MutationObserver(debouncedInject);
observer.observe(document.body, { childList: true, subtree: true });

debouncedInject();

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'GITHUB_NAVIGATION') {
    setTimeout(() => {
        document.querySelectorAll('.muleflow-injected-container').forEach(el => el.classList.remove('muleflow-injected-container'));
        debouncedInject();
    }, 500);
    setTimeout(debouncedInject, 2000);
  }
});

