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

console.log('MuleFlow Diff Visualizer: Background script loaded.');
