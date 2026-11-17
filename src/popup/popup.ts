// The toolbar popup: pick series + book, master switch, per-site switch,
// and "reveal all on this page".

import { ALL_SERIES } from '../generated/series-index';
import { loadSettings, saveSettings, maxActiveSeries, shouldShowRatingPrompt, PAYMENTS_ENABLED, type Settings } from '../core/settings';
import { REVIEWS_URL } from '../core/links';
import { renderPickers, renderSeriesList, pickSeries, pickBook } from '../ui/pickers';
import { initGate, allowPick, isProUser, gateReady } from '../ui/gate';
import { IS_SAFARI_BUILD } from '../core/native';
import type { Request, StatusReply, RevealAllReply } from '../core/messages';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enabledEl = $<HTMLInputElement>('enabled');
const seriesEl = $<HTMLSelectElement>('series');
const bookEl = $<HTMLSelectElement>('book');
const tierNote = $('tier-note');
const singleEl = $('single');
const multiEl = $('multi');
const listEl = $('series-list');
const addEl = $<HTMLSelectElement>('add-series');
const rateEl = $('rate');
const rateLink = $<HTMLAnchorElement>('rate-link');
const rateDismiss = $<HTMLButtonElement>('rate-dismiss');
rateLink.href = REVIEWS_URL;
const siteStatus = $('site-status');
const siteControls = $('site-controls');
const siteName = $('site-name');
const siteEnabled = $<HTMLInputElement>('site-enabled');
const revealBtn = $<HTMLButtonElement>('reveal-all');

let settings: Settings;
let site: StatusReply | null = null;

function render() {
  document.body.classList.toggle('off', !settings.enabled);
  enabledEl.checked = settings.enabled;

  // Pro (Safari) gets a list of series; everyone else edits one series slot.
  const multi = isProUser();
  singleEl.hidden = multi;
  multiEl.hidden = !multi;
  if (multi) renderSeriesList(listEl, addEl, settings.active, (active) => save({ active }));
  else renderPickers(seriesEl, bookEl, settings);

  tierNote.hidden = !PAYMENTS_ENABLED || ALL_SERIES.length < 2 || maxActiveSeries(settings.isPro) > 1;
  rateEl.hidden = !shouldShowRatingPrompt(settings, Date.now());

  if (site) {
    siteName.textContent = site.siteName;
    siteEnabled.checked = !settings.disabledSites.includes(site.siteId);
    revealBtn.disabled = site.blockedCount === 0;
    revealBtn.textContent = site.blockedCount > 0 ? `Reveal all on this page (${site.blockedCount})` : 'Nothing hidden on this page';
  }
}

async function save(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  render();
  await saveSettings(patch);
  // Content script rescans on storage change; refresh the count shortly after.
  setTimeout(refreshSite, 250);
}

async function sendToTab<T>(msg: Request): Promise<T | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return null;
  try {
    return (await chrome.tabs.sendMessage(tab.id, msg)) as T;
  } catch {
    return null; // no content script here: not a supported site
  }
}

async function refreshSite() {
  site = await sendToTab<StatusReply>({ type: 'ss:getStatus' });
  siteControls.hidden = !site;
  siteStatus.hidden = !!site;
  if (!site) siteStatus.textContent = "Loreward doesn't run on this page.";
  render();
}

enabledEl.addEventListener('change', () => save({ enabled: enabledEl.checked }));

seriesEl.addEventListener('change', async () => {
  const picked = seriesEl.value;
  render(); // put the dropdown back until the pick is allowed
  if (await allowPick(picked)) save(pickSeries(picked));
});

bookEl.addEventListener('change', () => {
  const patch = pickBook(settings, Number(bookEl.value));
  if (patch) save(patch);
});

siteEnabled.addEventListener('change', () => {
  if (!site) return;
  const others = settings.disabledSites.filter((s) => s !== site!.siteId);
  save({ disabledSites: siteEnabled.checked ? others : [...others, site.siteId] });
});

// Either choice retires the rating prompt for good.
rateLink.addEventListener('click', () => save({ ratingPrompt: 'done' }));
rateDismiss.addEventListener('click', () => save({ ratingPrompt: 'done' }));

revealBtn.addEventListener('click', async () => {
  await sendToTab<RevealAllReply>({ type: 'ss:revealAll' });
  await refreshSite();
});

(async () => {
  settings = await loadSettings();
  await initGate();
  // Keep the stored Pro flag in step with the App Store (it decides how many series the page shields).
  // Only when the app answered, so an unreachable app never downgrades a Pro reader.
  if (IS_SAFARI_BUILD && gateReady() && settings.isPro !== isProUser()) await save({ isPro: isProUser() });
  render();
  await refreshSite();
})();
