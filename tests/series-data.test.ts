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

  it('has no keyword that the allowlist would silently drop', () => {
    const allow = new Set(s.allowlist.map((w) => w.toLowerCase()));
    expect((s.keywords ?? []).filter((k) => allow.has(k.toLowerCase()))).toEqual([]);
  });

  it('gives every event a real book, subjects, cues, a confidence and a unique id', () => {
    const ev = s.events ?? [];
    const bad = ev.filter(
      (e) => e.happensIn < 1 || e.happensIn > s.books.length || !e.subjects.length || !e.cues.length ||
        !['high', 'medium', 'low'].includes(e.confidence),
    );
    expect(bad.map((e) => e.id)).toEqual([]);
    const ids = ev.map((e) => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('has no event cue so short or bare that it matches almost anything', () => {
    const bad = (s.events ?? []).flatMap((e) => e.cues).filter((c) => c.replace('*', '').trim().length < 3);
    expect(bad).toEqual([]);
  });

  it('blocks something for a book-1 reader and nothing for a last-book reader', () => {
    expect(compileMatcher(s, 1).blockedTermCount).toBeGreaterThan(0);
    expect(compileMatcher(s, s.books.length).blockedTermCount).toBe(0);
  });
});
