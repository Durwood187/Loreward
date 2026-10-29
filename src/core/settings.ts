// Everything the extension remembers lives here, in chrome.storage.local
// (on this device only; we deliberately don't use storage.sync).

import { ALL_SERIES } from '../generated/series-index';
import type { SeriesData } from './types';

export interface ActiveSeries {
  seriesId: string;
  /** The book the reader is on now. Terms from later books get blurred. */
  currentBook: number;
}

export interface Settings {
  /** Master on/off switch. */
  enabled: boolean;
  /** Series the reader is shielding. Free tier: at most one (see maxActiveSeries). */
  active: ActiveSeries[];
  /** Site adapter ids (e.g. "reddit") where the reader turned the shield off. */
  disabledSites: string[];
  /**
   * Paid-tier flag. Stub only: nothing sets it to true yet. ExtensionPay will
   * own this later; until then it only gates "more than one series".
   */
  isPro: boolean;
  /** When Loreward was installed (ms since 1970), set by the background worker. 0 = unknown. */
  installedAt: number;
  /** The one-time "leave a rating" prompt: still to show, or already clicked/dismissed. */
  ratingPrompt: 'pending' | 'done';
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  active: [],
  disabledSites: [],
  isPro: false,
  installedAt: 0,
  ratingPrompt: 'pending',
};

/**
 * Payments aren't live yet. Until they are, the "one series at a time" note stays
 * hidden, so nobody is told about an upgrade they can't buy. Flip with ExtensionPay.
 */
export const PAYMENTS_ENABLED = false;

/** The paid-tier gate. Free users shield one series at a time. */
export function maxActiveSeries(isPro: boolean): number {
  return isPro ? Infinity : 1;
}

/** Show the rating prompt only once, to people who have used Loreward for a week. */
export const RATING_PROMPT_AFTER_DAYS = 7;
export function shouldShowRatingPrompt(settings: Settings, now: number): boolean {
  if (settings.ratingPrompt !== 'pending' || !settings.installedAt) return false;
  if (settings.active.length === 0) return false; // hasn't set up yet; nothing to rate
  return now - settings.installedAt >= RATING_PROMPT_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export function findSeries(id: string, all: SeriesData[] = ALL_SERIES): SeriesData | undefined {
  return all.find((s) => s.id === id);
}

/**
 * The series that should actually be shielded right now: known series only,
 * book number clamped to the series, and trimmed to what the tier allows.
 */
export function effectiveActive(settings: Settings, all: SeriesData[] = ALL_SERIES): ActiveSeries[] {
  return settings.active
    .filter((a) => findSeries(a.seriesId, all))
    .map((a) => {
      const books = findSeries(a.seriesId, all)!.books.length;
      return { ...a, currentBook: Math.min(Math.max(1, a.currentBook), books) };
    })
    .slice(0, maxActiveSeries(settings.isPro));
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS as unknown as Record<string, unknown>);
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.local.set(patch);
}

/** Calls back whenever any setting changes (from the popup, another tab, etc.). */
export function onSettingsChanged(callback: () => void): void {
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'local') callback();
  });
}
