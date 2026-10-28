// The shield: finds content units on the page, checks their text, blurs the
// ones that may spoil, and watches for new content (infinite scroll, lazy
// loading, single-page navigation).
//
// Two reasons to blur, each with its own label:
//   "term"   the text mentions a name/term from a later book (strong label)
//   "maybe"  an AI-written answer on a page about the series, with no term
//            match. AI answers spoil with facts about early characters
//            ("Kaladin becomes…"), which name matching can't catch, so on
//            series-related pages they stay blurred until clicked (soft label).
//
// State lives on the elements themselves as data-ss-state:
//   "blocked"  blurred, with a "click to reveal" label in front of it
//   "revealed" the reader clicked it; never re-blurred on this page
//   (none)     checked and safe, or not checked yet
//
// This file has no chrome.* calls, so the tests can drive it directly.

import type { CompiledMatcher } from '../core/matcher';
import type { SiteAdapter } from './adapters/types';

export interface ActiveMatcher {
  /** Title of the book the reader is on, used in the label ("past Oathbringer"). */
  bookTitle: string;
  /** Series name for the soft label ("may contain spoilers for …"). */
  seriesName: string;
  matcher: CompiledMatcher;
  /** Is this text about the series at all? (keywords, titles, any term) */
  isRelevant: (text: string) => boolean;
}

type Verdict = { kind: 'term' | 'maybe'; text: string } | null;

const STATE = 'data-ss-state';
const LABEL_CLASS = 'ss-label';

/** Collect changes for this long after the last one before scanning… */
const DEBOUNCE_MS = 100;
/** …but never wait longer than this while changes keep coming. */
const MAX_WAIT_MS = 300;

export class Shield {
  private matchers: ActiveMatcher[] = [];
  private on = false;
  /** Last text we checked per unit, so unchanged units are skipped. */
  private checkedText = new WeakMap<Element, string>();
  private labels = new WeakMap<Element, HTMLElement>();
  private unitForLabel = new WeakMap<Element, Element>();
  private observer: MutationObserver | null = null;
  private pending = new Set<Node>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private firstPendingAt = 0;

  constructor(
    private readonly adapter: SiteAdapter,
    private readonly doc: Document = document,
    /** Page-level text that says what the page is about (e.g. the search query). */
    private readonly pageContext: () => string = () => adapter.pageContext?.(doc.location) ?? '',
  ) {}

  /** Applies new settings and rescans the whole page. Revealed units stay revealed. */
  configure(matchers: ActiveMatcher[], on: boolean): void {
    this.matchers = matchers;
    this.on = on && matchers.length > 0;
    this.checkedText = new WeakMap();
    for (const el of this.doc.querySelectorAll(`[${STATE}="blocked"]`)) this.unblock(el);
    this.scan(this.doc);
  }

  /** Starts watching for new content and for clicks on blurred units. */
  start(): void {
    if (this.observer) return; // already started
    this.doc.addEventListener('click', this.onClick, true); // capture: run before the site's own handlers
    this.observer = new MutationObserver((mutations) => this.onMutations(mutations));
    this.observer.observe(this.doc.documentElement, { childList: true, subtree: true });
  }

  stop(): void {
    this.doc.removeEventListener('click', this.onClick, true);
    this.observer?.disconnect();
    this.observer = null;
    if (this.timer) clearTimeout(this.timer);
  }

  /** Checks every unit in, around, or equal to `root`. */
  scan(root: Node): void {
    if (!this.on) return;
    const sel = this.adapter.unitSelector;
    const units = new Set<Element>();
    if (root instanceof this.doc.defaultView!.Element) {
      // Text added inside an existing unit (e.g. a comment body loading late).
      const outer = root.closest(sel);
      if (outer) units.add(outer);
    }
    if ('querySelectorAll' in root) {
      for (const el of (root as ParentNode).querySelectorAll(sel)) units.add(el);
    }
    for (const unit of units) {
      // Our own labels can match unit selectors (they borrow the unit's slot); never check them.
      if (!unit.classList.contains(LABEL_CLASS)) this.check(unit);
    }
  }

  revealAll(): number {
    const blocked = [...this.doc.querySelectorAll(`[${STATE}="blocked"]`)];
    blocked.forEach((el) => this.reveal(el));
    return blocked.length;
  }

  blockedCount(): number {
    return this.doc.querySelectorAll(`[${STATE}="blocked"]`).length;
  }

  /** Runs any queued scan right away (used by tests). */
  flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.firstPendingAt = 0;
    const nodes = [...this.pending];
    this.pending.clear();
    for (const node of nodes) if (node.isConnected) this.scan(node);
  }

  // --- internals ---------------------------------------------------------

  private check(unit: Element): void {
    if (unit.getAttribute(STATE) === 'revealed') return;
    const text = this.adapter.getText ? this.adapter.getText(unit) : readableText(unit);
    if (this.checkedText.get(unit) === text) return;
    this.checkedText.set(unit, text);

    const verdict = this.judge(unit, text);
    if (verdict) this.block(unit, verdict);
    else this.unblock(unit);
  }

  private judge(unit: Element, text: string): Verdict {
    for (const { matcher, bookTitle } of this.matchers) {
      // Never put the matched term in the label: that would be the spoiler.
      if (matcher.findSpoiler(text)) return { kind: 'term', text: `Spoilers past ${bookTitle} — click to reveal` };
    }
    const ai = this.adapter.aiAnswerSelector;
    // Empty AI containers (not loaded / not expanded yet) are left alone;
    // they're checked the moment text arrives (see onMutations).
    if (ai && unit.matches(ai) && text.trim()) {
      const context = this.pageContext();
      for (const { isRelevant, seriesName } of this.matchers) {
        if (isRelevant(context) || isRelevant(text)) {
          return { kind: 'maybe', text: `May contain spoilers for ${seriesName} — click to reveal` };
        }
      }
    }
    return null;
  }

  private block(unit: Element, verdict: NonNullable<Verdict>): void {
    unit.setAttribute(STATE, 'blocked');
    let label = this.labels.get(unit);
    if (!label) {
      label = this.doc.createElement('div');
      label.className = LABEL_CLASS;
      // Inside custom elements, children only render if they sit in a named
      // slot, so the label borrows the unit's slot.
      const slot = unit.getAttribute('slot');
      if (slot) label.setAttribute('slot', slot);
      const button = this.doc.createElement('button');
      button.type = 'button';
      label.append(button);
      unit.before(label);
      this.labels.set(unit, label);
      this.unitForLabel.set(label, unit);
    }
    // An AI answer can start as "maybe" and become "term" as it types out.
    label.setAttribute('data-kind', verdict.kind);
    label.firstElementChild!.textContent = verdict.text;
  }

  private unblock(unit: Element): void {
    if (unit.getAttribute(STATE) === 'blocked') unit.removeAttribute(STATE);
    this.removeLabel(unit);
  }

  private reveal(unit: Element): void {
    unit.setAttribute(STATE, 'revealed');
    this.removeLabel(unit);
  }

  private removeLabel(unit: Element): void {
    this.labels.get(unit)?.remove();
    this.labels.delete(unit);
  }

  private onClick = (event: Event): void => {
    // composedPath() sees through shadow DOM, so clicks inside a custom element count.
    for (const node of event.composedPath()) {
      if (!(node instanceof this.doc.defaultView!.Element)) continue;
      const unit = node.classList.contains(LABEL_CLASS)
        ? this.unitForLabel.get(node)
        : node.getAttribute(STATE) === 'blocked'
          ? node
          : undefined;
      if (unit) {
        // Stop the site from following a link or opening the post.
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.reveal(unit);
        return;
      }
    }
  };

  private onMutations(mutations: MutationRecord[]): void {
    const ai = this.adapter.aiAnswerSelector;
    let urgent = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        let el: Element | null = null;
        if (node.nodeType === Node.TEXT_NODE) el = node.parentElement;
        else if (node.nodeType === Node.ELEMENT_NODE && !(node as Element).classList.contains(LABEL_CLASS)) el = node as Element;
        if (!el) continue;
        this.pending.add(el);
        // AI answers are scanned right away, not after the pause: observer
        // callbacks run before the browser paints, so the first words never show.
        if (ai && !urgent && (el.closest(ai) || el.querySelector(ai))) urgent = true;
      }
    }
    if (this.pending.size === 0) return;
    if (urgent) {
      this.flush();
      return;
    }
    const now = Date.now();
    if (!this.firstPendingAt) this.firstPendingAt = now;
    if (this.timer) clearTimeout(this.timer);
    const wait = now - this.firstPendingAt >= MAX_WAIT_MS ? 0 : DEBOUNCE_MS;
    this.timer = setTimeout(() => this.flush(), wait);
  }
}

/**
 * The unit's text, skipping code the reader never sees: inline <style> and
 * <script> blocks (Google embeds CSS inside its AI Overview, for example).
 */
export function readableText(root: Element): string {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */, {
    acceptNode: (node) =>
      node.parentElement?.closest('style, script, noscript, template') ? 2 /* FILTER_REJECT */ : 1 /* FILTER_ACCEPT */,
  });
  let text = '';
  for (let n = walker.nextNode(); n; n = walker.nextNode()) text += n.textContent;
  return text;
}
