import { describe, it, expect } from 'vitest';
import { compileMatcher } from '../src/core/matcher';
import type { SeriesData } from '../src/core/types';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// A small made-up series so each test is easy to reason about.
const series: SeriesData = {
  id: 'test',
  name: 'Test Series',
  verified: true,
  books: [1, 2, 3, 4, 5].map((index) => ({ index, title: `Book ${index}` })),
  allowlist: ['Storm', 'Light'],
  terms: [
    { term: 'Evi', introducedIn: 4, type: 'character', confidence: 'high' },
    { term: 'Veil', introducedIn: 2, type: 'character', confidence: 'high' },
    { term: 'Raboniel', aliases: ['Lady of Pains'], introducedIn: 5, type: 'character', caseSensitive: false, confidence: 'high' },
    { term: 'Everstorm', introducedIn: 2, type: 'event', confidence: 'high' },
    { term: 'Oathgate', introducedIn: 2, type: 'concept', confidence: 'high' },
    { term: 'Battle of Thaylen Field', aliases: ['Thaylen Field'], introducedIn: 4, type: 'event', confidence: 'high' },
    { term: 'Fused', introducedIn: 4, type: 'concept', caseSensitive: true, confidence: 'high' },
    { term: 'Pattern', introducedIn: 2, type: 'character', confidence: 'high' },
    { term: 'Yelig-nar', aliases: ['Yelignar'], introducedIn: 4, type: 'character', confidence: 'high' },
    { term: 'blade', introducedIn: 3, type: 'concept', confidence: 'low' },
    // Its only alias is an allowlisted word, and the main spelling is too: never matches alone.
    { term: 'Storm', aliases: ['Light'], introducedIn: 3, type: 'concept', confidence: 'low' },
    { term: 'Storm Cellar', introducedIn: 3, type: 'place', confidence: 'low' },
    { term: 'Kadash', introducedIn: 1, type: 'character', confidence: 'high' },
  ],
};

const onBook = (n: number) => compileMatcher(series, n);
const termIn = (n: number, text: string) => onBook(n).findSpoiler(text)?.term ?? null;

describe('which books are blocked', () => {
  it('blocks a term from a later book', () => {
    expect(termIn(3, 'I love Evi so much')).toBe('Evi');
  });
  it('does not block a term from the current book (reader is on it)', () => {
    expect(termIn(4, 'I love Evi so much')).toBeNull();
  });
  it('does not block a term from an earlier book', () => {
    expect(termIn(5, 'I love Evi so much')).toBeNull();
  });
  it('never blocks book-1 terms', () => {
    expect(termIn(1, 'Kadash is here')).toBeNull();
  });
  it('blocks nothing for a reader on the last book', () => {
    expect(onBook(5).blockedTermCount).toBe(0);
  });
  it('counts blocked terms (allowlist-only terms do not count)', () => {
    // Book 1 reader: everything except Kadash, minus the all-allowlisted "Storm" term.
    expect(onBook(1).blockedTermCount).toBe(series.terms.length - 2);
  });
  it('reports the book the term comes from', () => {
    expect(onBook(1).findSpoiler('Raboniel!')).toMatchObject({ term: 'Raboniel', introducedIn: 5 });
  });
});

describe('whole-word matching', () => {
  it.each([
    ['Evil is afoot', null],
    ['Devi went home', null],
    ['Evian water', null],
    ['Evi2 username', null],
    ['my_Evi_tag', null],
    ['Ëvi with an accent before', null],
    ['Shardblade', null], // "blade" inside a longer word
  ])('does not match inside other words: %s', (text, expected) => {
    expect(termIn(1, text)).toBe(expected);
  });

  it.each([
    ['Evi.', 'Evi'],
    ['(Evi)', 'Evi'],
    ['"Evi"', 'Evi'],
    ['Evi-like behaviour', 'Evi'],
    ['—Evi—', 'Evi'],
    ['the blade broke', 'blade'],
  ])('matches next to punctuation: %s', (text, expected) => {
    expect(termIn(1, text)).toBe(expected);
  });
});

describe('aliases', () => {
  it('matches an alias and reports the main term', () => {
    expect(termIn(1, 'the Lady of Pains returns')).toBe('Raboniel');
  });
  it('matches hyphenated names and their hyphen-less alias', () => {
    expect(termIn(1, 'Yelig-nar shows up')).toBe('Yelig-nar');
    expect(termIn(1, 'Yelignar shows up')).toBe('Yelig-nar');
  });
  it('prefers the longest phrase', () => {
    expect(onBook(1).findSpoiler('the Battle of Thaylen Field was wild')?.matched).toBe('Battle of Thaylen Field');
  });
  it('lets multi-word terms span line breaks and extra spaces', () => {
    expect(termIn(1, 'Thaylen\n  Field')).toBe('Battle of Thaylen Field');
  });
});

describe('possessives and plurals', () => {
  it.each([
    ["Raboniel's plan", 'Raboniel'],
    ['Raboniel’s plan', 'Raboniel'], // curly apostrophe, common on phones and Reddit
    ["the Fused' spears", 'Fused'],
    ['the Everstorms came', 'Everstorm'],
    ['two Oathgates', 'Oathgate'],
    ["Lady of Pains's lab", 'Raboniel'],
  ])('%s', (text, expected) => {
    expect(termIn(1, text)).toBe(expected);
  });
});

describe('case sensitivity', () => {
  it('characters are case-sensitive by default', () => {
    expect(termIn(1, 'a bridal veil')).toBeNull();
    expect(termIn(1, 'Veil is Shallan')).toBe('Veil');
  });
  it('events and concepts are case-insensitive by default', () => {
    expect(termIn(1, 'the EVERSTORM is coming')).toBe('Everstorm');
    expect(termIn(1, 'everstorm lol')).toBe('Everstorm');
  });
  it('a term can opt out of case sensitivity', () => {
    expect(termIn(1, 'raboniel did nothing wrong')).toBe('Raboniel');
  });
  it('a concept can opt in to case sensitivity', () => {
    expect(termIn(1, 'fused glass beads')).toBeNull();
    expect(termIn(1, 'the Fused attack')).toBe('Fused');
  });
});

describe('allowlist', () => {
  it('never matches an allowlisted word on its own, even if listed as a term or alias', () => {
    expect(termIn(1, 'Storm and Light')).toBeNull();
    expect(termIn(1, 'storm')).toBeNull();
  });
  it('still matches a multi-word term that contains an allowlisted word', () => {
    expect(termIn(1, 'hide in the Storm Cellar')).toBe('Storm Cellar');
  });
});

describe('known false positives (documented, not bugs)', () => {
  // These show the limits of word matching. Tests pin current behavior so
  // any change is deliberate.
  it('a case-sensitive everyday word still matches at the start of a sentence', () => {
    expect(termIn(1, 'Pattern recognition is hard')).toBe('Pattern');
  });
  it('lowercase everyday use does not match', () => {
    expect(termIn(1, 'a nice pattern on the rug')).toBeNull();
  });
});

describe('robustness', () => {
  it('handles empty text', () => {
    expect(onBook(1).findSpoiler('')).toBeNull();
  });
  it('can be called repeatedly (no leftover regex state)', () => {
    const m = onBook(1);
    expect(m.findSpoiler('Evi')?.term).toBe('Evi');
    expect(m.findSpoiler('Evi')?.term).toBe('Evi');
    expect(m.findSpoiler('nothing here')).toBeNull();
  });
  it('treats regex characters in terms literally', () => {
    const odd: SeriesData = { ...series, allowlist: [], terms: [{ term: 'Mr. T', introducedIn: 2, type: 'character', confidence: 'low' }] };
    const m = compileMatcher(odd, 1);
    expect(m.findSpoiler('Mr. T is great')?.term).toBe('Mr. T');
    expect(m.findSpoiler('Mrx T is great')).toBeNull();
  });
  it('uses the earlier book when two terms share a spelling', () => {
    const dup: SeriesData = {
      ...series,
      allowlist: [],
      terms: [
        { term: 'Twin', introducedIn: 4, type: 'concept', confidence: 'low' },
        { term: 'Other', aliases: ['twin'], introducedIn: 2, type: 'concept', confidence: 'low' },
      ],
    };
    expect(compileMatcher(dup, 1).findSpoiler('twin')?.introducedIn).toBe(2);
  });
});

describe('everyday-word terms in the real series data', () => {
  // Guards the review decisions for Sibling, Diagram, Testament, Pattern and Lift.
  const real: SeriesData = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'series', 'stormlight.json'), 'utf8'));
  const m = compileMatcher(real, 1);
  it.each([
    'my sibling and I', 'My Sibling is visiting', 'a sibling rivalry',
    'draw a diagram', 'This Diagram shows the flow',
    'a testament to her skill', 'a nice pattern', 'give me a lift',
  ])('ignores everyday use: %s', (text) => {
    expect(m.findSpoiler(text)).toBeNull();
  });
  it.each([
    ['what does the Sibling want', 'the Sibling'],
    ['The Sibling withdrew', 'the Sibling'],
    ["the Diagram's plan", 'the Diagram'],
    ['Shallan and Pattern', 'Pattern'],
    ['I love Lift', 'Lift'],
    ['he drew Testament', 'Testament'],
  ])('matches the capitalized name: %s', (text, term) => {
    expect(m.findSpoiler(text)?.term).toBe(term);
  });
});
