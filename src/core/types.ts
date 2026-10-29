// Shared types. The series JSON files in data/series/ must match SeriesData
// (data/schema.json describes the same shape for editors and reviewers).

export type TermType = 'character' | 'place' | 'event' | 'concept';
export type Confidence = 'high' | 'medium' | 'low';

export interface Book {
  /** Position in reading order, starting at 1. Novellas get their own index. */
  index: number;
  title: string;
  kind?: 'novel' | 'novella';
  /** Abbreviations fans use, e.g. "WoR". Matched case-sensitively. */
  aliases?: string[];
}

export interface Term {
  term: string;
  aliases?: string[];
  /** Book index where knowing this term becomes a spoiler. */
  introducedIn: number;
  type: TermType;
  /** Defaults: true for character/place, false for event/concept. */
  caseSensitive?: boolean;
  /** How sure we are about introducedIn. Every term needs human review before release. */
  confidence: Confidence;
  /**
   * Only match on pages clearly about the series (a series subreddit, a search about it,
   * or text that also names another term/character/book). For names that are also
   * common words or names elsewhere, e.g. "Zane".
   */
  needsContext?: boolean;
  /** True when introducedIn was checked against the series wiki. */
  wikiChecked?: boolean;
  notes?: string;
}

export interface SeriesData {
  id: string;
  name: string;
  /** Plain series name for on-page labels (defaults to name). */
  shortName?: string;
  /** False until a human has reviewed every term. The popup shows a "draft" note while false. */
  verified: boolean;
  books: Book[];
  /** Common words that must never match on their own, even if listed as a term or alias. */
  allowlist: string[];
  /**
   * Words that show a search is about this series (series name, main
   * characters, places). Book titles and all terms count automatically.
   */
  keywords?: string[];
  terms: Term[];
}
