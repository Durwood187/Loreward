// Content script entry point: runs on supported sites at document_start.
// Wires settings (chrome.storage) and popup messages to the Shield.

import { compileMatcher, compileRelevance, compileBookMentions } from '../core/matcher';
import { loadSettings, onSettingsChanged, effectiveActive, findSeries } from '../core/settings';
import type { Request, StatusReply, RevealAllReply } from '../core/messages';
import { adapterForHost } from './adapters';
import { Shield, type ActiveMatcher } from './shield';

const adapter = adapterForHost(location.hostname);

if (adapter) {
  const shield = new Shield(adapter);

  async function applySettings() {
    const settings = await loadSettings();
    const siteOn = settings.enabled && !settings.disabledSites.includes(adapter!.id);
    const matchers: ActiveMatcher[] = effectiveActive(settings).map(({ seriesId, currentBook }) => {
      const series = findSeries(seriesId)!;
      return {
        bookTitle: series.books[currentBook - 1].title,
        currentBook,
        booksMentioned: compileBookMentions(series),
        seriesName: series.shortName ?? series.name,
        matcher: compileMatcher(series, currentBook),
        isRelevant: compileRelevance(series),
      };
    });
    shield.configure(matchers, siteOn);
  }

  // Start observing immediately so nothing added during page load is missed;
  // queued nodes are scanned once settings arrive (configure() scans the whole page anyway).
  shield.start();
  applySettings();
  onSettingsChanged(applySettings);

  chrome.runtime.onMessage.addListener((msg: Request, _sender, sendResponse) => {
    if (msg?.type === 'ss:getStatus') {
      const reply: StatusReply = { siteId: adapter.id, siteName: adapter.name, blockedCount: shield.blockedCount() };
      sendResponse(reply);
    } else if (msg?.type === 'ss:revealAll') {
      const reply: RevealAllReply = { revealed: shield.revealAll() };
      sendResponse(reply);
    }
  });
}
