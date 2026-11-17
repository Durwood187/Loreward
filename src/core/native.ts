// Talking to the iPhone app from the Safari extension (Safari only).
//
// The Safari build is made with `npm run build:safari`, which sets __SAFARI__ and
// adds the "nativeMessaging" permission. The Chrome build never includes either,
// so Chrome stays free with its minimal permissions.
//
// The app side (SafariWebExtensionHandler.swift) keeps the free-series choice in
// the iPhone Keychain, so deleting and reinstalling doesn't reset it, and reads
// "Pro" from what the Loreward app recorded after a purchase.

import type { Entitlement } from './entitlement';

declare const __SAFARI__: boolean;
export const IS_SAFARI_BUILD: boolean = typeof __SAFARI__ !== 'undefined' && __SAFARI__;

type NativeReply = { ok?: boolean; isPro?: boolean; freeSeries?: string | null; switchUsed?: boolean };

function send(message: object): Promise<NativeReply | null> {
  return new Promise((resolve) => {
    try {
      // Safari ignores the application id; the extension always talks to its own app.
      chrome.runtime.sendNativeMessage('com.durwoodextensions.Loreward', message, (reply: NativeReply) => {
        resolve(chrome.runtime.lastError ? null : reply ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

/** Free/Pro state from the iPhone app, or null if the app couldn't be reached. */
export async function loadEntitlement(): Promise<Entitlement | null> {
  const r = await send({ type: 'getEntitlement' });
  if (!r || typeof r.isPro !== 'boolean') return null;
  return { isPro: r.isPro, freeSeries: r.freeSeries ?? null, switchUsed: !!r.switchUsed };
}

/** Records the free-series choice (first pick or the one switch). */
export async function saveFreeChoice(e: Entitlement): Promise<boolean> {
  const r = await send({ type: 'saveFreeChoice', freeSeries: e.freeSeries, switchUsed: e.switchUsed });
  return !!r?.ok;
}

/** Opens the Loreward app on its Pro screen. */
export function openProScreen(): void {
  chrome.tabs.create({ url: 'loreward://pro' });
}
