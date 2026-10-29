// @vitest-environment jsdom
//
// Runs the real Shield + Reddit adapter against saved Reddit pages, offline.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { compileMatcher, compileRelevance, compileBookMentions } from '../src/core/matcher';
import type { SeriesData } from '../src/core/types';
import { redditAdapter } from '../src/content/adapters/reddit';
import { Shield } from '../src/content/shield';
import { loadFixture, useDocument } from './helpers/fixture';

// A small stand-in series so these tests don't change when the real term list is reviewed.
const series: SeriesData = {
  id: 'test', name: 'Test', verified: true, allowlist: [],
  books: [1, 2, 3, 4, 5, 6].map((index) => ({ index, title: `Book ${index} Title` })),
  terms: [
    { term: 'Everstorm', introducedIn: 2, type: 'event', confidence: 'high' },
    { term: 'Evi', introducedIn: 4, type: 'character', confidence: 'high' },
    { term: 'Veil', introducedIn: 2, type: 'character', confidence: 'high' },
    { term: 'Pattern', introducedIn: 2, type: 'character', confidence: 'high' },
    { term: 'Raboniel', aliases: ['Lady of Pains'], introducedIn: 6, type: 'character', confidence: 'high' },
  ],
};
const onBook = (n: number) => [{
  bookTitle: `Book ${n} Title`, currentBook: n, seriesName: 'Test',
  matcher: compileMatcher(series, n), isRelevant: () => false, booksMentioned: () => new Set<number>(),
}];

const BLOCKED = ['post-title-spoiler', 'post-body-spoiler', 'c-reply-spoiler', 'c-parent-spoiler'];
const SAFE = ['post-safe', 'c-parent-safe', 'c-reply-safe', 'c-false-positive'];
// New Reddit only: posts the author tagged as spoilers.
const TAGGED_BLOCKED = ['tagged-title-spoiler'];
const TAGGED_SAFE = ['tagged-body-spoiler'];

/** The element the shield treats as the unit for a fixture item. */
function unitOf(name: string): Element {
  const el = document.querySelector(`[data-test="${name}"]`)!;
  if (el.matches(redditAdapter.unitSelector)) return el;
  // A comment's own body is the first one inside it (replies come after).
  return el.querySelector('[slot="comment"]:not(.ss-label), :scope > .entry')!;
}
const stateOf = (name: string) => unitOf(name).getAttribute('data-ss-state');
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Reddit adapter host matching', () => {
  it.each(['reddit.com', 'www.reddit.com', 'old.reddit.com', 'sh.reddit.com', 'new.reddit.com'])('runs on %s', (host) => {
    expect(redditAdapter.matchesHost(host)).toBe(true);
  });
  it.each(['notreddit.com', 'reddit.com.example.org', 'example.com'])('does not run on %s', (host) => {
    expect(redditAdapter.matchesHost(host)).toBe(false);
  });
});

describe('new Reddit spoiler-tagged posts', () => {
  let shield: Shield;
  beforeEach(() => {
    useDocument(loadFixture('reddit-new.html'));
    shield = new Shield(redditAdapter, document);
    shield.configure(onBook(1), true);
  });
  afterEach(() => shield.stop());

  it('leaves a tagged post alone when only its hidden body has the spoiler (Reddit already covers it)', () => {
    for (const name of TAGGED_SAFE) expect([name, stateOf(name)]).toEqual([name, null]);
  });
  it('still blurs a tagged post whose visible title has the spoiler', () => {
    for (const name of TAGGED_BLOCKED) expect([name, stateOf(name)]).toEqual([name, 'blocked']);
  });
});

describe.each([
  // [name, fixture, extra blurred units beyond BLOCKED (tagged posts, new Reddit only)]
  ['new Reddit', 'reddit-new.html', TAGGED_BLOCKED.length],
  ['old Reddit', 'reddit-old.html', 0],
])('%s', (_label, fixture, extra) => {
  let shield: Shield;

  beforeEach(() => {
    useDocument(loadFixture(fixture));
    shield = new Shield(redditAdapter, document);
    shield.configure(onBook(1), true);
    shield.start();
  });
  afterEach(() => shield.stop());

  it('blurs units that mention later-book terms', () => {
    for (const name of BLOCKED) expect([name, stateOf(name)]).toEqual([name, 'blocked']);
  });

  it('leaves safe units alone, including parents of spoiler replies and lowercase lookalikes', () => {
    for (const name of SAFE) expect([name, stateOf(name)]).toEqual([name, null]);
  });

  it('counts blurred units', () => {
    expect(shield.blockedCount()).toBe(BLOCKED.length + extra);
  });

  it('puts a label in front of each blurred unit without naming the term', () => {
    const unit = unitOf('post-title-spoiler');
    const label = unit.previousElementSibling!;
    expect(label.classList.contains('ss-label')).toBe(true);
    expect(label.textContent).toBe('Spoilers past Book 1 Title — click to reveal');
    expect(label.textContent).not.toContain('Raboniel');
    expect(document.querySelectorAll('.ss-label')).toHaveLength(BLOCKED.length + extra);
  });

  it('gives labels the unit\'s slot so they render inside custom elements', () => {
    const unit = unitOf('c-reply-spoiler');
    expect(unit.previousElementSibling!.getAttribute('slot')).toBe(unit.getAttribute('slot'));
  });

  it('reveals only the clicked unit and stops the click reaching the site', () => {
    let siteSawClick = false;
    document.addEventListener('click', () => (siteSawClick = true));
    const notPrevented = click(unitOf('post-body-spoiler'));
    expect(notPrevented).toBe(false);
    expect(siteSawClick).toBe(false);
    expect(stateOf('post-body-spoiler')).toBe('revealed');
    expect(stateOf('post-title-spoiler')).toBe('blocked');
    expect(unitOf('post-body-spoiler').previousElementSibling?.classList.contains('ss-label') ?? false).toBe(false);
  });

  it('reveals when the label itself is clicked', () => {
    const label = unitOf('c-parent-spoiler').previousElementSibling!;
    click(label.querySelector('button')!);
    expect(stateOf('c-parent-spoiler')).toBe('revealed');
  });

  it('never treats its own labels as content units', () => {
    // Labels borrow the unit's slot, so they can match the unit selector.
    shield.configure(onBook(1), true);
    for (const label of document.querySelectorAll('.ss-label')) {
      expect(label.hasAttribute('data-ss-state')).toBe(false);
    }
  });

  it('lets clicks on safe units through', () => {
    expect(click(unitOf('post-safe'))).toBe(true);
  });

  it('reveal all clears every blur on the page', () => {
    expect(shield.revealAll()).toBe(BLOCKED.length + extra);
    expect(shield.blockedCount()).toBe(0);
    expect(document.querySelectorAll('.ss-label')).toHaveLength(0);
  });

  it('turning the shield off removes all blurs and labels', () => {
    shield.configure(onBook(1), false);
    expect(shield.blockedCount()).toBe(0);
    expect(document.querySelectorAll('.ss-label')).toHaveLength(0);
  });

  it('moving to a later book unblurs terms the reader has now reached', () => {
    shield.configure(onBook(4), true);
    expect(stateOf('post-body-spoiler')).toBe(null); // Everstorm, book 2
    expect(stateOf('c-parent-spoiler')).toBe(null); // Evi, book 4
    expect(stateOf('post-title-spoiler')).toBe('blocked'); // Raboniel, book 6
  });

  it('keeps revealed units revealed when settings change', () => {
    click(unitOf('post-title-spoiler'));
    shield.configure(onBook(2), true);
    expect(stateOf('post-title-spoiler')).toBe('revealed');
  });

  it('checks content added later (infinite scroll)', async () => {
    const safe = document.querySelector('[data-test="c-parent-safe"]')!;
    const copy = safe.cloneNode(true) as Element;
    copy.setAttribute('data-test', 'added');
    copy.querySelectorAll('[data-test]').forEach((el) => el.removeAttribute('data-test'));
    const text = copy.querySelector('[slot="comment"] p, :scope > .entry .md p')!;
    text.textContent = 'The Everstorm arrives';
    safe.parentElement!.append(copy);
    expect(stateOf('added')).toBe(null); // not yet: scans are batched
    await wait(250);
    expect(stateOf('added')).toBe('blocked');
  });

  it('rechecks a unit whose text loads after it appears', async () => {
    const p = unitOf('c-reply-safe').querySelector('p')!;
    p.append(document.createTextNode(' Also: Evi.'));
    await wait(250);
    expect(stateOf('c-reply-safe')).toBe('blocked');
  });
});

describe.each([
  ['new Reddit', 'reddit-new.html'],
  ['old Reddit', 'reddit-old.html'],
])('%s: posts and comments that name a book (reader is on book 2)', (_label, fixture) => {
  const named: SeriesData = {
    ...series,
    keywords: ['Stormlight', 'Kaladin'],
    books: [
      { index: 1, title: 'The Way of Kings', aliases: ['WoK'] },
      { index: 2, title: 'Words of Radiance', aliases: ['WoR'] },
      { index: 3, title: 'Oathbringer', aliases: ['OB'] },
      { index: 4, title: 'Rhythm of War', aliases: ['RoW'] },
    ],
  };
  const onBook2 = [{
    bookTitle: 'Words of Radiance', currentBook: 2, seriesName: 'Test',
    matcher: compileMatcher(named, 2), isRelevant: compileRelevance(named), booksMentioned: compileBookMentions(named),
  }];
  let shield: Shield;
  /** Loads the fixture with new text in the "c-parent-safe" comment, as if on the given page. */
  function load(commentText: string, path: string) {
    useDocument(loadFixture(fixture));
    unitOf('c-parent-safe').querySelector('p')!.textContent = commentText;
    const context = redditAdapter.pageContext!({ pathname: path } as Location);
    shield = new Shield(redditAdapter, document, () => context);
    shield.configure(onBook2, true);
  }
  const kind = () => unitOf('c-parent-safe').previousElementSibling?.getAttribute('data-kind') ?? null;
  afterEach(() => shield.stop());

  it('a comment about the current book gets the amber "this book" label', () => {
    load('The ending of Words of Radiance destroyed me', '/r/Fantasy/comments/abc/best_endings/');
    expect(kind()).toBe('current');
  });
  it('a comment naming a later book gets "May spoil books after…"', () => {
    load('Wait until Rhythm of War', '/r/Fantasy/comments/abc/x/');
    expect(kind()).toBe('later');
  });
  it('in a series subreddit, bare abbreviations count', () => {
    load('RoW changes everything', '/r/Stormlight_Archive/comments/abc/x/');
    expect(kind()).toBe('later');
  });
  it('outside a series subreddit, bare abbreviations alone do not count', () => {
    load('My OB said everything looks fine', '/r/BabyBumps/comments/abc/x/');
    expect(kind()).toBe(null);
  });
  it('earlier books only: left alone', () => {
    load('The Way of Kings was a slow start', '/r/Stormlight_Archive/comments/abc/x/');
    expect(kind()).toBe(null);
  });
  it('reads the subreddit from the page address', () => {
    expect(redditAdapter.pageContext!({ pathname: '/r/Stormlight_Archive/comments/1x/i_cant_understand/' } as Location))
      .toBe(' r Stormlight Archive comments 1x i cant understand ');
  });
});

describe('context-only terms on Reddit (reader on book 1)', () => {
  const mb: SeriesData = {
    id: 'mb', name: 'MB', verified: true, allowlist: [], keywords: ['Mistborn', 'Elend'],
    books: [1, 2, 3].map((index) => ({ index, title: `MB Book ${index}` })),
    terms: [{ term: 'Zane', introducedIn: 2, type: 'character', needsContext: true, confidence: 'high' }],
  };
  const on1 = [{
    bookTitle: 'MB Book 1', currentBook: 1, seriesName: 'MB',
    matcher: compileMatcher(mb, 1), isRelevant: compileRelevance(mb), booksMentioned: compileBookMentions(mb),
  }];
  let shield: Shield;
  function load(text: string, path: string) {
    useDocument(loadFixture('reddit-new.html'));
    unitOf('c-parent-safe').querySelector('p')!.textContent = text;
    const context = redditAdapter.pageContext!({ pathname: path } as Location);
    shield = new Shield(redditAdapter, document, () => context);
    shield.configure(on1, true);
  }
  afterEach(() => shield.stop());

  it('blurs "Zane" in a Mistborn subreddit', () => {
    load('Zane is my favorite villain', '/r/Mistborn/comments/abc/x/');
    expect(unitOf('c-parent-safe').getAttribute('data-ss-state')).toBe('blocked');
  });
  it('blurs "Zane" anywhere when the comment also mentions the series', () => {
    load('Zane vs Elend was the best fight', '/r/Fantasy/comments/abc/x/');
    expect(unitOf('c-parent-safe').getAttribute('data-ss-state')).toBe('blocked');
  });
  it('leaves other Zanes alone', () => {
    load('Zane Lowe interviewed them last week', '/r/Music/comments/abc/x/');
    expect(unitOf('c-parent-safe').getAttribute('data-ss-state')).toBe(null);
  });
});
