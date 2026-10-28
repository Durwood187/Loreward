import { describe, it, expect, vi } from 'vitest';

// settings.ts imports the generated series index; give it a tiny fake instead
// so this test doesn't depend on running the build first.
vi.mock('../src/generated/series-index', () => ({ ALL_SERIES: [] }));

import { effectiveActive, maxActiveSeries, DEFAULT_SETTINGS } from '../src/core/settings';
import type { SeriesData } from '../src/core/types';

const mk = (id: string, books: number): SeriesData => ({
  id, name: id, verified: true, allowlist: [], terms: [],
  books: Array.from({ length: books }, (_, i) => ({ index: i + 1, title: `B${i + 1}` })),
});
const all = [mk('a', 5), mk('b', 3)];

describe('paid-tier gate', () => {
  it('defaults to free', () => {
    expect(DEFAULT_SETTINGS.isPro).toBe(false);
  });
  it('free users get one series, pro users unlimited', () => {
    expect(maxActiveSeries(false)).toBe(1);
    expect(maxActiveSeries(true)).toBe(Infinity);
  });
  it('trims extra series on the free tier', () => {
    const s = { ...DEFAULT_SETTINGS, active: [{ seriesId: 'a', currentBook: 2 }, { seriesId: 'b', currentBook: 1 }] };
    expect(effectiveActive(s, all).map((a) => a.seriesId)).toEqual(['a']);
    expect(effectiveActive({ ...s, isPro: true }, all).map((a) => a.seriesId)).toEqual(['a', 'b']);
  });
});

describe('effectiveActive cleanup', () => {
  it('drops series that no longer exist', () => {
    const s = { ...DEFAULT_SETTINGS, active: [{ seriesId: 'gone', currentBook: 1 }, { seriesId: 'b', currentBook: 1 }] };
    expect(effectiveActive(s, all).map((a) => a.seriesId)).toEqual(['b']);
  });
  it('clamps the book number into range', () => {
    const s = { ...DEFAULT_SETTINGS, active: [{ seriesId: 'b', currentBook: 99 }] };
    expect(effectiveActive(s, all)[0].currentBook).toBe(3);
  });
});
