// @vitest-environment jsdom
//
// Runs the real Shield + Google adapter against a saved Google results page, offline.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileMatcher, compileRelevance, compileBookMentions } from '../src/core/matcher';
import type { SeriesData } from '../src/core/types';
import { googleAdapter } from '../src/content/adapters/google';
import { Shield } from '../src/content/shield';
import { loadFixture, useDocument } from './helpers/fixture';

const series: SeriesData = {
  id: 'test', name: 'Test Series (compatible)', shortName: 'Test Series', verified: true,
  allowlist: ['Storm'],
  keywords: ['Kaladin', 'Shallan'],
  books: [1, 2, 3, 4, 5, 6].map((index) => ({ index, title: `Book ${index} Title` })),
  terms: [
    { term: 'Everstorm', introducedIn: 2, type: 'event', confidence: 'high' },
    { term: 'Veil', introducedIn: 2, type: 'character', confidence: 'high' },
    { term: 'Pattern', introducedIn: 2, type: 'character', confidence: 'high' },
    { term: 'Raboniel', introducedIn: 6, type: 'character', confidence: 'high' },
  ],
};
const matchers = [{
  bookTitle: 'Book 1 Title',
  currentBook: 1,
  seriesName: 'Test Series',
  matcher: compileMatcher(series, 1),
  isRelevant: compileRelevance(series),
  booksMentioned: compileBookMentions(series),
}];

const SERIES_QUERY = 'what happens to kaladin in wind and truth';
const OTHER_QUERY = 'how tall is the eiffel tower';

const el = (name: string) => document.querySelector(`[data-test="${name}"]`)!;
/** The question button / answer area inside a "People also ask" item. */
const question = (name: string) => el(name).querySelector('[role="button"]')!;
const answer = (name: string) => el(name).querySelector('[jsname="NRdf4c"]')!;
const stateOf = (node: Element) => node.getAttribute('data-ss-state');
const labelOf = (node: Element) => {
  const prev = node.previousElementSibling;
  return prev?.classList.contains('ss-label') ? prev : null;
};
const click = (node: Element) => node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
/** Lets MutationObserver callbacks run (they're microtasks), without waiting for the debounce. */
const tick = () => new Promise((r) => setTimeout(r, 0));
/** Simulates Google opening a "People also ask" item and typing out its AI answer. */
function openAnswer(name: string, text: string) {
  question(name).setAttribute('aria-expanded', 'true');
  const p = document.createElement('div');
  p.textContent = text;
  answer(name).append(p);
}

describe('Google adapter host matching', () => {
  it.each(['www.google.com', 'google.com'])('runs on %s', (host) => {
    expect(googleAdapter.matchesHost(host)).toBe(true);
  });
  it.each(['mail.google.com', 'google.com.evil.example', 'www.google.co.uk'])('does not run on %s', (host) => {
    expect(googleAdapter.matchesHost(host)).toBe(false);
  });
  it('reads the search query from the URL', () => {
    expect(googleAdapter.pageContext!(new URL('https://www.google.com/search?q=who+is+raboniel&sca=1') as unknown as Location)).toBe('who is raboniel');
  });
});

describe('Google, search about the series', () => {
  let shield: Shield;
  beforeEach(() => {
    useDocument(loadFixture('google-search.html'));
    shield = new Shield(googleAdapter, document, () => SERIES_QUERY);
    shield.configure(matchers, true);
    shield.start();
  });
  afterEach(() => shield.stop());

  it('keeps the AI Overview blurred with the soft label, even without a term match', () => {
    const ai = el('ai-overview');
    expect(stateOf(ai)).toBe('blocked');
    expect(labelOf(ai)!.getAttribute('data-kind')).toBe('maybe');
    expect(labelOf(ai)!.textContent).toBe('May contain spoilers for Test Series — click to reveal');
  });

  it('upgrades the label to the strong one when a later-book term appears while it types', async () => {
    el('ai-overview').querySelector('.body')!.append(' Later, Raboniel arrives.');
    await tick();
    const label = labelOf(el('ai-overview'))!;
    expect(label.getAttribute('data-kind')).toBe('term');
    expect(label.textContent).toBe('Spoilers past Book 1 Title — click to reveal');
    expect(label.textContent).not.toContain('Raboniel');
  });

  it('uses name matching for regular results', () => {
    expect(stateOf(el('result-safe'))).toBe(null);
    expect(stateOf(el('result-spoiler'))).toBe('blocked');
    expect(labelOf(el('result-spoiler'))!.getAttribute('data-kind')).toBe('term');
    expect(stateOf(el('result-false-positive'))).toBe(null); // "veil", "pattern" in lowercase
  });

  it('uses name matching for "People also ask" questions', () => {
    expect(stateOf(question('paa-safe'))).toBe(null);
    expect(stateOf(question('paa-spoiler-question'))).toBe('blocked');
  });

  it('leaves empty answer areas alone (no empty blurred boxes)', () => {
    expect(stateOf(answer('paa-expandable'))).toBe(null);
    expect(labelOf(answer('paa-expandable'))).toBe(null);
  });

  it('keeps closed answers with hidden placeholder text blurred as a safety net', () => {
    // Google pre-fills closed answers; content.css hides the label until opened.
    expect(stateOf(answer('paa-safe'))).toBe('blocked');
  });

  it('ignores text inside <style>/<script> (Google embeds CSS in the AI Overview)', () => {
    // The fixture's style block contains ".Veil" and ".Evi-x": not shown to the reader, so no strong label.
    expect(labelOf(el('ai-overview'))!.getAttribute('data-kind')).toBe('maybe');
  });

  it('blurs an opened answer immediately, before the usual scan pause', async () => {
    openAnswer('paa-expandable', 'She marries Adolin at the end of book three.');
    await tick(); // no 100 ms wait: AI answers are scanned right away
    expect(stateOf(answer('paa-expandable'))).toBe('blocked');
    expect(labelOf(answer('paa-expandable'))!.getAttribute('data-kind')).toBe('maybe');
  });

  it('revealing a question does not reveal its answer', async () => {
    click(question('paa-spoiler-question'));
    expect(stateOf(question('paa-spoiler-question'))).toBe('revealed');
    openAnswer('paa-spoiler-question', 'A Fused scholar.');
    await tick();
    expect(stateOf(answer('paa-spoiler-question'))).toBe('blocked');
  });

  it('click reveals the AI Overview', () => {
    click(labelOf(el('ai-overview'))!.querySelector('button')!);
    expect(stateOf(el('ai-overview'))).toBe('revealed');
  });

  it('never treats its own labels as content', () => {
    for (const label of document.querySelectorAll('.ss-label')) expect(label.hasAttribute('data-ss-state')).toBe(false);
  });
});

describe('Google, unrelated search', () => {
  let shield: Shield;
  beforeEach(() => {
    useDocument(loadFixture('google-search.html'));
    // Make the page match the unrelated query.
    el('ai-overview').querySelector('.body')!.textContent = 'The Eiffel Tower is 330 metres tall.';
    shield = new Shield(googleAdapter, document, () => OTHER_QUERY);
    shield.configure(matchers, true);
    shield.start();
  });
  afterEach(() => shield.stop());

  it('shows AI answers normally', () => {
    expect(stateOf(el('ai-overview'))).toBe(null);
  });

  it('still holds back an AI answer whose own text turns out to be about the series', async () => {
    openAnswer('paa-expandable', 'Shallan is a character in a fantasy series.');
    await tick();
    expect(labelOf(answer('paa-expandable'))!.getAttribute('data-kind')).toBe('maybe');
  });

  it('still blurs a later-book term with the strong label', async () => {
    el('ai-overview').querySelector('.body')!.append(' Unlike the Everstorm.');
    await tick();
    expect(labelOf(el('ai-overview'))!.getAttribute('data-kind')).toBe('term');
  });

  it('turning the shield off releases everything', () => {
    shield.configure(matchers, false);
    expect(document.querySelectorAll('[data-ss-state="blocked"]')).toHaveLength(0);
    expect(document.querySelectorAll('.ss-label')).toHaveLength(0);
  });
});

describe('Google, results that name a book (reader is on book 2)', () => {
  const named: SeriesData = {
    ...series,
    books: [
      { index: 1, title: 'The Way of Kings', aliases: ['WoK'] },
      { index: 2, title: 'Words of Radiance', aliases: ['WoR', 'WOR'] },
      { index: 3, title: 'Oathbringer', aliases: ['OB'] },
      { index: 4, title: 'Wind and Truth', aliases: ['WaT'] },
    ],
  };
  const onBook2 = [{
    bookTitle: 'Words of Radiance', currentBook: 2, seriesName: 'Test Series',
    matcher: compileMatcher(named, 2), isRelevant: compileRelevance(named), booksMentioned: compileBookMentions(named),
  }];
  let shield: Shield;

  /** Builds a results page with one regular result per text. */
  function page(texts: string[], query: string) {
    useDocument(`<!doctype html><html><body><div id="rso">${texts
      .map((t, i) => `<div data-rpos="${i}"><div jscontroller="SC7lYd" data-test="r${i}"><h3>${t}</h3></div></div>`)
      .join('')}</div></body></html>`);
    shield = new Shield(googleAdapter, document, () => query);
    shield.configure(onBook2, true);
  }
  const kindOf = (i: number) => labelOf(el(`r${i}`))?.getAttribute('data-kind') ?? null;
  afterEach(() => shield.stop());

  it('marks results about the current book as "this book" (amber label)', () => {
    page(['Words of Radiance: Chapter 86 | Wiki', 'WOR: Chapter 86 Epigraph (spoilers)'], 'words of radiance chapter 86');
    expect([kindOf(0), kindOf(1)]).toEqual(['current', 'current']);
    expect(labelOf(el('r0'))!.textContent).toBe("May spoil Words of Radiance (the book you're reading) — click to reveal");
  });

  it('marks results about later books as "future books"', () => {
    page(['Chapter 86 | Wind and Truth', 'Oathbringer ending explained', 'Is OB better than WoR?'], 'kaladin chapter 86');
    expect([kindOf(0), kindOf(1), kindOf(2)]).toEqual(['later', 'later', 'later']);
    expect(labelOf(el('r0'))!.textContent).toBe('May spoil books after Words of Radiance — click to reveal');
  });

  it('a later book wins over the current book when both are named', () => {
    page(['Words of Radiance vs Wind and Truth'], 'stormlight');
    expect(kindOf(0)).toBe('later');
  });

  it('leaves results that only name earlier books alone', () => {
    page(['The Way of Kings audiobook review', 'Is WoK worth it?'], 'way of kings audiobook');
    expect([kindOf(0), kindOf(1)]).toEqual([null, null]);
  });

  it('a later-book term still gets the hard label', () => {
    page(['Words of Radiance: where Raboniel fits in'], 'words of radiance');
    expect(kindOf(0)).toBe('term');
  });

  it('ignores abbreviations on unrelated searches ("OB/GYN")', () => {
    page(['Find an OB/GYN near you', 'OB clinic hours'], 'ob gyn near me');
    expect([kindOf(0), kindOf(1)]).toEqual([null, null]);
  });

  it('abbreviations are case-sensitive ("row" is not Rhythm of War)', () => {
    page(['Words of Radiance row of seats'], 'words of radiance');
    // "Words of Radiance" (current) is named, "wat"/"ob" lowercase never are.
    expect(kindOf(0)).toBe('current');
    page(['what about ob and wat'], 'stormlight');
    expect(kindOf(0)).toBe(null);
  });
});

describe('reading text from pages with no whitespace between elements', () => {
  it('separates blocks, so a title right after a site name is still a whole word', async () => {
    const { readableText } = await import('../src/content/shield');
    useDocument('<!doctype html><html><body><div id="x"><span>example.com</span><h3>Words of Radiance</h3><div>Raboniel</div></div></body></html>');
    expect(readableText(document.getElementById('x')!)).toBe('example.com Words of Radiance Raboniel');
  });
  it('keeps words split by inline formatting together', async () => {
    const { readableText } = await import('../src/content/shield');
    useDocument('<!doctype html><html><body><div id="x">Kal<b>adin</b>\'s <em>bridge</em>crew</div></body></html>');
    expect(readableText(document.getElementById('x')!)).toBe("Kaladin's bridgecrew");
  });
});

describe('Google AI Mode (the chat-style tab)', () => {
  let shield: Shield;
  beforeEach(() => {
    useDocument(loadFixture('google-ai-mode.html'));
    shield = new Shield(googleAdapter, document, () => 'what happens to kaladin');
    shield.configure(matchers, true);
    shield.start();
  });
  afterEach(() => shield.stop());

  it('holds back an AI Mode answer on a search about the series', () => {
    const a = el('answer-1');
    expect(stateOf(a)).toBe('blocked');
    expect(labelOf(a)!.getAttribute('data-kind')).toBe('maybe');
  });

  it('leaves the question itself readable', () => {
    expect(stateOf(el('turn-1'))).toBe(null);
    expect(stateOf(el('turn-1').querySelector('.query')!)).toBe(null);
  });

  it('blurs a follow-up answer right away, as it arrives', async () => {
    el('conversation').innerHTML =
      '<div data-xid="aim-mars-turn-root"><div class="query">and then?</div>' +
      '<div data-subtree="aimc" data-test="answer-2"><span>Later, Raboniel arrives.</span></div></div>';
    await tick();
    expect(stateOf(el('answer-2'))).toBe('blocked');
    expect(labelOf(el('answer-2'))!.getAttribute('data-kind')).toBe('term');
  });
});

describe('Google AI Overview with an AI Mode block inside it', () => {
  it('blurs the AI Overview once, not a box inside a box', () => {
    useDocument(loadFixture('google-search.html'));
    const shield = new Shield(googleAdapter, document, () => SERIES_QUERY);
    shield.configure(matchers, true);
    shield.start();
    const inner = el('ai-overview').querySelector('[data-subtree="aimc"]')!;
    expect(stateOf(el('ai-overview'))).toBe('blocked');
    expect(inner.hasAttribute('data-ss-state')).toBe(false);
    expect(el('ai-overview').querySelectorAll('.ss-label')).toHaveLength(0);
    shield.stop();
  });
});
