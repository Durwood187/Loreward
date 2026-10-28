// @vitest-environment jsdom
//
// Runs the real Shield + Google adapter against a saved Google results page, offline.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileMatcher, compileRelevance } from '../src/core/matcher';
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
  seriesName: 'Test Series',
  matcher: compileMatcher(series, 1),
  isRelevant: compileRelevance(series),
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
