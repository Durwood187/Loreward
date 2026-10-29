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

import { shouldShowRatingPrompt } from '../src/core/settings';

describe('rating prompt timing', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const base = { ...DEFAULT_SETTINGS, active: [{ seriesId: 'a', currentBook: 1 }], installedAt: 1_000_000 };
  it('waits a week after install', () => {
    expect(shouldShowRatingPrompt(base, base.installedAt + 6 * DAY)).toBe(false);
    expect(shouldShowRatingPrompt(base, base.installedAt + 7 * DAY)).toBe(true);
  });
  it('never shows again once clicked or dismissed', () => {
    expect(shouldShowRatingPrompt({ ...base, ratingPrompt: 'done' }, base.installedAt + 30 * DAY)).toBe(false);
  });
  it('not for people who never set up a series', () => {
    expect(shouldShowRatingPrompt({ ...base, active: [] }, base.installedAt + 30 * DAY)).toBe(false);
  });
  it('not when the install date is unknown', () => {
    expect(shouldShowRatingPrompt({ ...base, installedAt: 0 }, 30 * DAY)).toBe(false);
  });
});
