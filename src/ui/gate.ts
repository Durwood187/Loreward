// The free/Pro gate around the series picker (Safari build only).
// In the Chrome build IS_SAFARI_BUILD is false and every pick goes straight through.

import { checkPick, applyPick, canUse, type Entitlement } from '../core/entitlement';
import { IS_SAFARI_BUILD, loadEntitlement, saveFreeChoice, openProScreen } from '../core/native';
import { findSeries } from '../core/settings';
import type { SeriesData } from '../core/types';

let ent: Entitlement | null = null;

/** Call once on page load. */
export async function initGate(): Promise<void> {
  if (IS_SAFARI_BUILD) ent = await loadEntitlement();
}

/** True once the iPhone app has answered (Safari build). */
export function gateReady(): boolean {
  return ent !== null;
}

/** Pro on the Safari build (false on Chrome, or if the app couldn't be reached). */
export function isProUser(): boolean {
  return IS_SAFARI_BUILD && !!ent?.isPro;
}

/** Dropdown label: free users see "· Pro" on series they can't use once they've picked. */
export function seriesLabel(s: SeriesData): string {
  if (!IS_SAFARI_BUILD || !ent || ent.isPro || ent.freeSeries === null) return s.name;
  return canUse(ent, s.id) ? s.name : `${s.name} · Pro`;
}

type Choice = { label: string; value: string; primary?: boolean };

/** A small in-page dialog (Safari's popup doesn't do window.confirm well). */
function ask(title: string, body: string, choices: Choice[]): Promise<string> {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'gate';
    wrap.setAttribute('role', 'dialog');
    const box = document.createElement('div');
    box.className = 'gate-box';
    const h = document.createElement('p');
    h.className = 'gate-title';
    h.textContent = title;
    const p = document.createElement('p');
    p.className = 'gate-body';
    p.textContent = body;
    box.append(h, p);
    for (const c of choices) {
      const b = document.createElement('button');
      b.textContent = c.label;
      if (!c.primary) b.className = 'secondary';
      b.addEventListener('click', () => { wrap.remove(); resolve(c.value); });
      box.append(b);
    }
    wrap.append(box);
    document.body.append(wrap);
  });
}

/**
 * Whether picking this series may go ahead. Shows the first-pick confirmation,
 * the one-time switch offer, or the Pro prompt as needed, and records the choice.
 */
export async function allowPick(seriesId: string): Promise<boolean> {
  if (!IS_SAFARI_BUILD) return true;
  if (!ent) {
    await ask('Finish setting up', 'Open the Loreward app once, then try again.', [{ label: 'OK', value: 'ok', primary: true }]);
    return false;
  }
  const name = findSeries(seriesId)?.name ?? 'this series';
  const check = checkPick(ent, seriesId);
  if (check.kind === 'ok') return true;

  let answer: string;
  if (check.kind === 'confirmFirst') {
    answer = await ask(`Make ${name} your free series?`,
      'Free Loreward shields one series. Loreward Pro unlocks every series, now and future, with a one-time purchase in the Loreward app.',
      [{ label: 'Make it my free series', value: 'yes', primary: true }, { label: 'Cancel', value: 'no' }]);
  } else if (check.kind === 'confirmSwitch') {
    answer = await ask(`Switch your free series to ${name}?`,
      'You can only switch your free series once. Loreward Pro unlocks every series.',
      [{ label: 'Switch', value: 'yes', primary: true }, { label: 'Unlock Pro', value: 'pro' }, { label: 'Cancel', value: 'no' }]);
  } else {
    answer = await ask(`${name} needs Loreward Pro`,
      'Unlock every series, now and future, with a one-time purchase in the Loreward app.',
      [{ label: 'Unlock Pro', value: 'pro', primary: true }, { label: 'Not now', value: 'no' }]);
  }

  if (answer === 'pro') openProScreen();
  if (answer !== 'yes') return false;
  const next = applyPick(ent, seriesId);
  if (!(await saveFreeChoice(next))) {
    await ask("Couldn't save that", 'Open the Loreward app once, then try again.', [{ label: 'OK', value: 'ok', primary: true }]);
    return false;
  }
  ent = next;
  return true;
}
