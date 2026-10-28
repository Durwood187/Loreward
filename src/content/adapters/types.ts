// A site adapter tells the shield what a "content unit" is on one site:
// a post, a comment, a video card, a search result. We blur whole units,
// never individual words.

export interface SiteAdapter {
  /** Stable id, saved in settings when the reader turns a site off. */
  id: string;
  /** Shown in the popup ("Shield on Reddit"). */
  name: string;
  matchesHost(hostname: string): boolean;
  /**
   * CSS selector for content units. Units must not contain other units'
   * text (e.g. a comment unit must exclude its replies), otherwise one
   * spoiler reply would blur the whole thread above it.
   */
  unitSelector: string;
  /** The text to check for a unit. Defaults to its textContent. */
  getText?(unit: Element): string;
  /**
   * Units that are AI-written answers (must also match unitSelector). On a
   * page about the reader's series, these stay blurred until clicked even
   * without a term match, because they spoil with facts, not just names.
   */
  aiAnswerSelector?: string;
  /** Text that says what the whole page is about, e.g. the search query. */
  pageContext?(location: Location): string;
}
