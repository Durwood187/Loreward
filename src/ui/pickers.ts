// The series + book dropdowns, shared by the popup and the welcome page,
// plus the Pro series list (several series at once) used by the popup.

import { ALL_SERIES } from '../generated/series-index';
import { findSeries, type Settings, type ActiveSeries } from '../core/settings';
import { seriesLabel } from './gate';

function option(value: string, label: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

/** "Not started yet" plus every book of the series. */
export function bookOptions(seriesId: string): HTMLOptionElement[] {
  const series = findSeries(seriesId);
  if (!series) return [option('', 'Choose a series first')];
  return [
    option('0', 'Not started yet'),
    ...series.books.map((b) => option(String(b.index), `${b.index}. ${b.title}${b.kind === 'novella' ? ' (novella)' : ''}`)),
  ];
}

/** Fills both dropdowns from the current settings. Edits the first series slot. */
export function renderPickers(seriesEl: HTMLSelectElement, bookEl: HTMLSelectElement, settings: Settings): void {
  const current = settings.active[0];
  seriesEl.replaceChildren(option('', 'Choose a series…'), ...ALL_SERIES.map((s) => option(s.id, seriesLabel(s))));
  seriesEl.value = current?.seriesId ?? '';
  bookEl.disabled = !current;
  bookEl.replaceChildren(...bookOptions(current?.seriesId ?? ''));
  if (current) bookEl.value = String(current.currentBook);
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

// ---- Pro: several series at once ----

/** Adds a series to the list (no-op if it's already there). */
export function addSeries(active: ActiveSeries[], seriesId: string): ActiveSeries[] {
  if (!seriesId || active.some((a) => a.seriesId === seriesId)) return active;
  return [...active, { seriesId, currentBook: 1 }];
}

export function removeSeries(active: ActiveSeries[], seriesId: string): ActiveSeries[] {
  return active.filter((a) => a.seriesId !== seriesId);
}

export function setBook(active: ActiveSeries[], seriesId: string, book: number): ActiveSeries[] {
  return active.map((a) => (a.seriesId === seriesId ? { ...a, currentBook: book } : a));
}

/** Draws the Pro list: one row per series (name, book, remove) and an "Add a series" dropdown. */
export function renderSeriesList(listEl: HTMLElement, addEl: HTMLSelectElement, active: ActiveSeries[],
                                 onChange: (next: ActiveSeries[]) => void): void {
  listEl.replaceChildren(...active.filter((a) => findSeries(a.seriesId)).map((a) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = findSeries(a.seriesId)!.name;
    const book = document.createElement('select');
    book.setAttribute('aria-label', `Book for ${name.textContent}`);
    book.replaceChildren(...bookOptions(a.seriesId));
    book.value = String(a.currentBook);
    book.addEventListener('change', () => onChange(setBook(active, a.seriesId, Number(book.value))));
    const remove = document.createElement('button');
    remove.className = 'remove';
    remove.textContent = '✕';
    remove.title = `Remove ${name.textContent}`;
    remove.addEventListener('click', () => onChange(removeSeries(active, a.seriesId)));
    li.append(name, remove, book);
    return li;
  }));
  const available = ALL_SERIES.filter((s) => !active.some((a) => a.seriesId === s.id));
  addEl.replaceChildren(option('', active.length ? '+ Add another series…' : 'Choose a series…'),
                        ...available.map((s) => option(s.id, s.name)));
  addEl.hidden = available.length === 0;
  addEl.onchange = () => onChange(addSeries(active, addEl.value));
}
