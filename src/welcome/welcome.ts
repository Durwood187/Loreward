// Welcome page, opened once on install: pick series + book, learn the labels.

import { loadSettings, saveSettings, type Settings } from '../core/settings';
import { renderPickers, pickSeries, pickBook } from '../ui/pickers';

const seriesEl = document.getElementById('series') as HTMLSelectElement;
const bookEl = document.getElementById('book') as HTMLSelectElement;
const savedEl = document.getElementById('saved')!;
let settings: Settings;

async function save(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  renderPickers(seriesEl, bookEl, settings);
  savedEl.hidden = settings.active.length === 0;
  await saveSettings(patch);
}

seriesEl.addEventListener('change', () => save(pickSeries(seriesEl.value)));
bookEl.addEventListener('change', () => {
  const patch = pickBook(settings, Number(bookEl.value));
  if (patch) save(patch);
});

(async () => {
  settings = await loadSettings();
  renderPickers(seriesEl, bookEl, settings);
  savedEl.hidden = settings.active.length === 0;
})();
