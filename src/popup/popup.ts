// The toolbar popup: pick series + book, master switch, per-site switch,
// and "reveal all on this page".

import { ALL_SERIES } from '../generated/series-index';
import { loadSettings, saveSettings, findSeries, maxActiveSeries, type Settings } from '../core/settings';
import type { Request, StatusReply, RevealAllReply } from '../core/messages';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const enabledEl = $<HTMLInputElement>('enabled');
const seriesEl = $<HTMLSelectElement>('series');
const bookEl = $<HTMLSelectElement>('book');
const draftNote = $('draft-note');
const tierNote = $('tier-note');
const siteStatus = $('site-status');
const siteControls = $('site-controls');
const siteName = $('site-name');
const siteEnabled = $<HTMLInputElement>('site-enabled');
const revealBtn = $<HTMLButtonElement>('reveal-all');

let settings: Settings;
let site: StatusReply | null = null;

function option(value: string, label: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

function render() {
  document.body.classList.toggle('off', !settings.enabled);
  enabledEl.checked = settings.enabled;

  // v1 UI edits one series slot. With isPro, more slots become possible later.
  const current = settings.active[0];
  seriesEl.replaceChildren(option('', 'Choose a series…'), ...ALL_SERIES.map((s) => option(s.id, s.name)));
  seriesEl.value = current?.seriesId ?? '';

  const series = current ? findSeries(current.seriesId) : undefined;
  bookEl.disabled = !series;
  bookEl.replaceChildren(
    ...(series
      ? series.books.map((b) => option(String(b.index), `${b.index}. ${b.title}${b.kind === 'novella' ? ' (novella)' : ''}`))
      : [option('', 'Choose a series first')]),
  );
  if (series && current) bookEl.value = String(current.currentBook);

  draftNote.hidden = !series || series.verified;
  tierNote.hidden = ALL_SERIES.length < 2 || maxActiveSeries(settings.isPro) > 1;

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
  if (!site) siteStatus.textContent = "SpoilerShield doesn't run on this page.";
  render();
}

enabledEl.addEventListener('change', () => save({ enabled: enabledEl.checked }));

seriesEl.addEventListener('change', () => {
  const id = seriesEl.value;
  // Free tier: picking a series replaces the current one.
  save({ active: id ? [{ seriesId: id, currentBook: 1 }] : [] });
});

bookEl.addEventListener('change', () => {
  const current = settings.active[0];
  if (!current) return;
  save({ active: [{ ...current, currentBook: Number(bookEl.value) }, ...settings.active.slice(1)] });
});

siteEnabled.addEventListener('change', () => {
  if (!site) return;
  const others = settings.disabledSites.filter((s) => s !== site!.siteId);
  save({ disabledSites: siteEnabled.checked ? others : [...others, site.siteId] });
});

revealBtn.addEventListener('click', async () => {
  await sendToTab<RevealAllReply>({ type: 'ss:revealAll' });
  await refreshSite();
});

(async () => {
  settings = await loadSettings();
  render();
  await refreshSite();
})();
