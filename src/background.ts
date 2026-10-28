// Background service worker. Its only job: open the welcome page on first
// install, so a new user picks a series and book instead of seeing nothing happen.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});
