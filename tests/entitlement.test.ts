import { describe, it, expect } from 'vitest';
import { checkPick, applyPick, canUse, NO_ENTITLEMENT, type Entitlement } from '../src/core/entitlement';

describe('free vs Pro series rules', () => {
  it('asks to confirm the very first pick', () => {
    expect(checkPick(NO_ENTITLEMENT, 'stormlight').kind).toBe('confirmFirst');
    expect(applyPick(NO_ENTITLEMENT, 'stormlight')).toEqual({ isPro: false, freeSeries: 'stormlight', switchUsed: false });
  });

  it('lets the reader re-pick their free series or clear the choice without asking', () => {
    const e: Entitlement = { isPro: false, freeSeries: 'stormlight', switchUsed: false };
    expect(checkPick(e, 'stormlight').kind).toBe('ok');
    expect(checkPick(e, '').kind).toBe('ok');
    expect(applyPick(e, 'stormlight')).toEqual(e);
  });

  it('offers exactly one switch, then requires Pro', () => {
    const first: Entitlement = { isPro: false, freeSeries: 'stormlight', switchUsed: false };
    expect(checkPick(first, 'red-rising').kind).toBe('confirmSwitch');
    const switched = applyPick(first, 'red-rising');
    expect(switched).toEqual({ isPro: false, freeSeries: 'red-rising', switchUsed: true });
    expect(checkPick(switched, 'mistborn').kind).toBe('needsPro');
    expect(applyPick(switched, 'mistborn')).toEqual(switched); // not allowed: unchanged
    expect(checkPick(switched, 'red-rising').kind).toBe('ok');
  });

  it('lets Pro pick anything and never records a free pick', () => {
    const pro: Entitlement = { isPro: true, freeSeries: null, switchUsed: false };
    expect(checkPick(pro, 'acotar').kind).toBe('ok');
    expect(applyPick(pro, 'acotar')).toEqual(pro);
    expect(canUse(pro, 'acotar')).toBe(true);
  });

  it('only allows the free series for free users', () => {
    const e: Entitlement = { isPro: false, freeSeries: 'mistborn', switchUsed: true };
    expect(canUse(e, 'mistborn')).toBe(true);
    expect(canUse(e, 'stormlight')).toBe(false);
    expect(canUse(NO_ENTITLEMENT, 'stormlight')).toBe(false);
  });
});

import { addSeries, removeSeries, setBook } from '../src/ui/pickers';
import { effectiveActive, DEFAULT_SETTINGS } from '../src/core/settings';

describe('Pro series list', () => {
  it('adds, removes and sets books without duplicates', () => {
    let a = addSeries([], 'stormlight');
    a = addSeries(a, 'red-rising');
    a = addSeries(a, 'stormlight');
    expect(a.map((x) => x.seriesId)).toEqual(['stormlight', 'red-rising']);
    a = setBook(a, 'red-rising', 0);
    expect(a[1].currentBook).toBe(0);
    expect(removeSeries(a, 'stormlight').map((x) => x.seriesId)).toEqual(['red-rising']);
  });

  it('treats "Not started yet" (book 0) like book 1 and flags it', () => {
    const s = { ...DEFAULT_SETTINGS, isPro: true, active: [{ seriesId: 'stormlight', currentBook: 0 }, { seriesId: 'mistborn', currentBook: 2 }] };
    const eff = effectiveActive(s);
    expect(eff[0]).toMatchObject({ seriesId: 'stormlight', currentBook: 1, notStarted: true });
    expect(eff[1]).toMatchObject({ seriesId: 'mistborn', currentBook: 2, notStarted: false });
  });

  it('shields only the first series when not Pro', () => {
    const s = { ...DEFAULT_SETTINGS, isPro: false, active: [{ seriesId: 'stormlight', currentBook: 3 }, { seriesId: 'mistborn', currentBook: 2 }] };
    expect(effectiveActive(s).map((x) => x.seriesId)).toEqual(['stormlight']);
  });
});
