// The matcher answers one question: "does this text mention a term from a
// book the reader hasn't reached yet?"
//
// Matching rules:
//   - Whole words only: "Evi" matches "Evi" but not "Evil" or "Devi".
//   - Aliases count the same as the main term.
//   - Possessives and simple plurals match: "Raboniel's", "Raboniel’s", "Fused" → "Fuseds" (harmless),
//     "Everstorm" → "Everstorms", "Oathgate" → "Oathgates".
//   - Case-sensitive by default for characters and places (so "Veil" ≠ "veil"),
//     case-insensitive by default for events and concepts. Each term can override this.
//   - Words in the series allowlist never match on their own.
//   - Spaces inside a multi-word term match any whitespace ("Thaylen  Field", a line break, etc.).
//
// For speed, all blocked terms for a (series, book) setting are compiled into
// at most two regular expressions (one case-sensitive, one not), once.

import type { SeriesData, Term } from './types';

export interface MatchHit {
  /** The term's main spelling (not the alias that matched). */
  term: string;
  /** The exact text that matched, e.g. "Raboniel’s". */
  matched: string;
  introducedIn: number;
}

export interface CompiledMatcher {
  /** Returns the first blocked term found in the text, or null if the text is safe. */
  findSpoiler(text: string): MatchHit | null;
  /** How many terms are being blocked at this setting (handy for tests and the popup). */
  blockedTermCount: number;
}

// Letters, digits, combining marks and underscore count as "part of a word".
const WORD_CHAR = '[\\p{L}\\p{N}\\p{M}_]';
// Optional ending after a term: possessive ('s / ’s / bare apostrophe) or plural (s / es).
const SUFFIX = "(?:['’]s|['’]|es|s)?";

export function isCaseSensitive(term: Term): boolean {
  if (term.caseSensitive !== undefined) return term.caseSensitive;
  return term.type === 'character' || term.type === 'place';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Turns a term into regex source: escaped, with internal spaces matching any whitespace. */
function toPattern(variant: string): string {
  return variant
    .trim()
    .split(/\s+/)
    .map(escapeRegex)
    .join('\\s+');
}

function normalizeSpaces(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function buildRegex(variants: string[], caseSensitive: boolean): RegExp | null {
  if (variants.length === 0) return null;
  // Longest first so "Battle of Thaylen Field" wins over "Thaylen Field".
  const sorted = [...new Set(variants)].sort((a, b) => b.length - a.length);
  const alternation = sorted.map(toPattern).join('|');
  const source = `(?<!${WORD_CHAR})(${alternation})${SUFFIX}(?!${WORD_CHAR})`;
  return new RegExp(source, caseSensitive ? 'gu' : 'giu');
}

/**
 * Builds a matcher for a reader who is currently on `currentBook`.
 * A term is blocked when its introducedIn is greater than currentBook.
 */
export function compileMatcher(series: SeriesData, currentBook: number): CompiledMatcher {
  const allow = new Set(series.allowlist.map((w) => w.toLowerCase()));

  // Lookup from the matched text back to its term. Keys are normalized:
  // exact spelling for case-sensitive variants, lowercase for the rest.
  const exactLookup = new Map<string, Term>();
  const foldedLookup = new Map<string, Term>();
  const exactVariants: string[] = [];
  const foldedVariants: string[] = [];
  let blockedTermCount = 0;

  for (const term of series.terms) {
    if (term.introducedIn <= currentBook) continue;
    const cs = isCaseSensitive(term);
    let usable = 0;
    for (const raw of [term.term, ...(term.aliases ?? [])]) {
      const variant = normalizeSpaces(raw);
      if (!variant || allow.has(variant.toLowerCase())) continue; // allowlisted words never match alone
      usable++;
      const [lookup, list, key] = cs
        ? [exactLookup, exactVariants, variant]
        : [foldedLookup, foldedVariants, variant.toLowerCase()];
      // If two terms share a spelling, keep the earlier book (the more conservative label).
      const existing = lookup.get(key);
      if (!existing || term.introducedIn < existing.introducedIn) lookup.set(key, term);
      list.push(variant);
    }
    if (usable > 0) blockedTermCount++;
  }

  const exactRe = buildRegex(exactVariants, true);
  const foldedRe = buildRegex(foldedVariants, false);

  function firstHit(re: RegExp | null, text: string, lookup: Map<string, Term>, fold: boolean): MatchHit | null {
    if (!re) return null;
    re.lastIndex = 0;
    const m = re.exec(text);
    if (!m) return null;
    const core = normalizeSpaces(m[1]);
    const term = lookup.get(fold ? core.toLowerCase() : core);
    if (!term) return null; // shouldn't happen; defensive
    return { term: term.term, matched: m[0], introducedIn: term.introducedIn };
  }

  return {
    blockedTermCount,
    findSpoiler(text: string): MatchHit | null {
      if (!text) return null;
      const normalized = text.normalize('NFC');
      return (
        firstHit(exactRe, normalized, exactLookup, false) ??
        firstHit(foldedRe, normalized, foldedLookup, true)
      );
    },
  };
}
