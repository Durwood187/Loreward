// Background service worker:
// - opens the welcome page on first install, so a new user picks a series and
//   book instead of seeing nothing happen;
// - remembers when Loreward was installed (used to time the one-time rating prompt).
//   People updating from 0.1.0 get today's date, so their prompt also waits a week.

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  const { installedAt } = await chrome.storage.local.get('installedAt');
  if (!installedAt) await chrome.storage.local.set({ installedAt: Date.now() });
});
