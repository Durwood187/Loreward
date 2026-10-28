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

/**
 * Builds a check for "is this text about the series at all?", e.g. a search
 * query. True if it mentions any keyword, book title (with or without a
 * leading "The"), or term from any book. Always case-insensitive, whole words.
 * Allowlisted words don't count on their own.
 */
export function compileRelevance(series: SeriesData): (text: string) => boolean {
  const allow = new Set(series.allowlist.map((w) => w.toLowerCase()));
  const words = [
    ...(series.keywords ?? []),
    ...series.books.flatMap((b) => [b.title, b.title.replace(/^the\s+/i, '')]),
    ...series.terms.flatMap((t) => [t.term, ...(t.aliases ?? [])]),
  ]
    .map(normalizeSpaces)
    .filter((w) => w && !allow.has(w.toLowerCase()));
  const re = buildRegex(words, false);
  return (text: string) => {
    if (!re || !text) return false;
    re.lastIndex = 0;
    return re.test(text.normalize('NFC'));
  };
}

/**
 * Builds a check for "which books of the series does this text name?".
 * Titles match case-insensitively (with or without a leading "The");
 * abbreviations from each book's `aliases` (e.g. "WoR") match case-sensitively,
 * since short all-caps strings are easy to collide with otherwise.
 */
export function compileBookMentions(series: SeriesData): (text: string) => Set<number> {
  const folded = new Map<string, number>();
  const exact = new Map<string, number>();
  for (const b of series.books) {
    for (const t of [b.title, b.title.replace(/^the\s+/i, '')]) folded.set(normalizeSpaces(t).toLowerCase(), b.index);
    for (const a of b.aliases ?? []) exact.set(normalizeSpaces(a), b.index);
  }
  const foldedRe = buildRegex([...folded.keys()], false);
  const exactRe = buildRegex([...exact.keys()], true);
  return (text: string) => {
    const found = new Set<number>();
    if (!text) return found;
    const normalized = text.normalize('NFC');
    for (const [re, lookup, fold] of [[foldedRe, folded, true], [exactRe, exact, false]] as const) {
      if (!re) continue;
      re.lastIndex = 0;
      for (const m of normalized.matchAll(re)) {
        const key = normalizeSpaces(m[1]);
        const index = lookup.get(fold ? key.toLowerCase() : key);
        if (index) found.add(index);
      }
    }
    return found;
  };
}
