// The series + book dropdowns, shared by the popup and the welcome page.

import { ALL_SERIES } from '../generated/series-index';
import { findSeries, type Settings } from '../core/settings';

function option(value: string, label: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

/** Fills both dropdowns from the current settings. v1 edits one series slot. */
export function renderPickers(seriesEl: HTMLSelectElement, bookEl: HTMLSelectElement, settings: Settings): void {
  const current = settings.active[0];
  seriesEl.replaceChildren(option('', 'Choose a series…'), ...ALL_SERIES.map((s) => option(s.id, s.name)));
  seriesEl.value = current?.seriesId ?? '';

  const series = current ? findSeries(current.seriesId) : undefined;
  bookEl.disabled = !series;
  bookEl.replaceChildren(
    ...(series
      ? series.books.map((b) => option(String(b.index), `${b.index}. ${b.title}${b.kind === 'novella' ? ' (novella)' : ''}`))
      : [option('', 'Choose a series first')]),
  );
  if (series && current) bookEl.value = String(current.currentBook);
}

/** Settings change for picking a series. Free tier: it replaces the current one. */
export function pickSeries(seriesId: string): Partial<Settings> {
  return { active: seriesId ? [{ seriesId, currentBook: 1 }] : [] };
}

/** Settings change for picking a book in the current series. */
export function pickBook(settings: Settings, book: number): Partial<Settings> | null {
  const current = settings.active[0];
  if (!current) return null;
  return { active: [{ ...current, currentBook: book }, ...settings.active.slice(1)] };
}
