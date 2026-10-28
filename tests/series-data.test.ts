// Sanity checks on every real series file, so a data mistake fails the build
// instead of silently weakening the shield.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileMatcher, isCaseSensitive } from '../src/core/matcher';
import type { SeriesData } from '../src/core/types';

const dir = join(__dirname, '..', 'data', 'series');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe.each(files)('%s', (file) => {
  const s: SeriesData = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const variants = (t: SeriesData['terms'][number]) => [t.term, ...(t.aliases ?? [])];

  it('has books numbered 1..N in order', () => {
    expect(s.books.map((b) => b.index)).toEqual(s.books.map((_, i) => i + 1));
  });

  it('assigns every term to a real book', () => {
    const bad = s.terms.filter((t) => t.introducedIn < 1 || t.introducedIn > s.books.length);
    expect(bad.map((t) => t.term)).toEqual([]);
  });

  it('gives every term a confidence', () => {
    const bad = s.terms.filter((t) => !['high', 'medium', 'low'].includes(t.confidence));
    expect(bad.map((t) => t.term)).toEqual([]);
  });

  it('has no spelling claimed by two different terms', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const t of s.terms) {
      for (const v of variants(t)) {
        const key = isCaseSensitive(t) ? v : v.toLowerCase();
        const owner = seen.get(key);
        if (owner && owner !== t.term) clashes.push(`${v} (${owner} / ${t.term})`);
        seen.set(key, t.term);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('has no term or alias that the allowlist would silently drop', () => {
    const allow = new Set(s.allowlist.map((w) => w.toLowerCase()));
    const dropped = s.terms.flatMap(variants).filter((v) => allow.has(v.toLowerCase()));
    expect(dropped).toEqual([]);
  });

  it('blocks something for a book-1 reader and nothing for a last-book reader', () => {
    expect(compileMatcher(s, 1).blockedTermCount).toBeGreaterThan(0);
    expect(compileMatcher(s, s.books.length).blockedTermCount).toBe(0);
  });
});
