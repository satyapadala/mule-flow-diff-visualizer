chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  // Only send messages to GitHub PR pages
  if (details.url.includes('github.com') && details.url.includes('/pull/')) {
    // Small delay to allow the content script to re-initialize on the new SPA state
    setTimeout(() => {
      chrome.tabs.sendMessage(details.tabId, {
        type: 'GITHUB_NAVIGATION',
        url: details.url,
      }).catch((err) => {
        // Ignore "Could not establish connection" errors. 
        // This happens if the content script hasn't loaded yet on a specific tab.
        // The content script's own MutationObserver will handle the injection anyway.
        // console.debug('MuleFlow: Navigation message suppressed (no receiver yet).');
      });
    }, 1000);
  }
});

console.log('MuleFlow Diff Visualizer: Background script loaded.');
