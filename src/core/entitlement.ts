// Free vs Pro on Safari/iPhone. Chrome stays free and never uses this.
//
// Free: one series. The first pick is confirmed ("this is your free series").
// One quiet switch is allowed, but only offered when someone tries to pick another
// series, so it reads as a courtesy rather than a second free series.
// Pro (one-time purchase in the iPhone app): any series.
//
// The rules live here, pure and tested. Where the state is stored is up to the
// caller (the Safari build keeps it in the iPhone Keychain via the native app).

export interface Entitlement {
  isPro: boolean;
  /** The series chosen as the free one, or null before the first pick. */
  freeSeries: string | null;
  /** True once the one free switch has been used. */
  switchUsed: boolean;
}

export const NO_ENTITLEMENT: Entitlement = { isPro: false, freeSeries: null, switchUsed: false };

export type PickCheck =
  /** Allowed straight away (Pro, clearing the choice, or re-picking the free series). */
  | { kind: 'ok' }
  /** First pick: confirm it will be the free series. */
  | { kind: 'confirmFirst' }
  /** A different series, switch still unused: offer the one-time switch (or Pro). */
  | { kind: 'confirmSwitch' }
  /** A different series, switch used: Pro only. */
  | { kind: 'needsPro' };

export function checkPick(e: Entitlement, seriesId: string): PickCheck {
  if (e.isPro || !seriesId || seriesId === e.freeSeries) return { kind: 'ok' };
  if (e.freeSeries === null) return { kind: 'confirmFirst' };
  return e.switchUsed ? { kind: 'needsPro' } : { kind: 'confirmSwitch' };
}

/** The entitlement after the reader confirms a first pick or a switch. */
export function applyPick(e: Entitlement, seriesId: string): Entitlement {
  const check = checkPick(e, seriesId);
  if (check.kind === 'confirmFirst') return { ...e, freeSeries: seriesId };
  if (check.kind === 'confirmSwitch') return { ...e, freeSeries: seriesId, switchUsed: true };
  return e; // ok (nothing to record) or needsPro (not allowed)
}

/** Whether a series can be shielded right now (used to label and to enforce). */
export function canUse(e: Entitlement, seriesId: string): boolean {
  return e.isPro || seriesId === e.freeSeries;
}
