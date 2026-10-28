// Reddit adapter: covers new Reddit (www/sh) and old Reddit (old.reddit.com).
//
// New Reddit is built from custom elements (structure confirmed on the live
// site, Oct 2026):
//   <shreddit-post post-title="…" [spoiler]>   one post (feed card or post page)
//     <h1|a slot="title">, <div slot="post-flair">, <shreddit-post-text-body slot="text-body">
//   <shreddit-comment>                         one comment; replies are nested inside it
//     <details> <div> <div>
//       <div slot="comment">…</div>            ← just this comment's own text
//       <shreddit-comment slot="children-…">   ← replies (not part of the unit)
//
// Old Reddit uses plain divs:
//   <div class="thing link|comment">
//     <div class="entry">…</div>               ← title/self-text or comment body
//     <div class="child">…</div>               ← replies (not part of the unit)
//
// Selectors here are the part most likely to break when Reddit changes its
// markup. tests/fixtures/reddit-*.html mirror the structure; TESTING.md has
// the live-site checklist.

import type { SiteAdapter } from './types';

export const redditAdapter: SiteAdapter = {
  id: 'reddit',
  name: 'Reddit',
  matchesHost: (host) => host === 'reddit.com' || host.endsWith('.reddit.com'),
  unitSelector: [
    'shreddit-post',
    // Any depth: the body sits inside <details>. Bodies never contain replies,
    // so each comment is still its own unit.
    'shreddit-comment [slot="comment"]',
    '.thing.link > .entry',
    '.thing.comment > .entry',
  ].join(', '),
  getText(unit) {
    // Feed cards sometimes keep the title only in an attribute.
    const title = unit.getAttribute('post-title') ?? '';
    if (unit.localName === 'shreddit-post' && unit.hasAttribute('spoiler')) {
      // The author tagged this as a spoiler, so Reddit already hides the body
      // behind its own cover. Only check what Reddit leaves visible (title and
      // flair); otherwise the reader has to click through two covers.
      const visible = [...unit.querySelectorAll('[slot="title"], [slot="post-flair"]')]
        .map((el) => el.textContent ?? '');
      return [title, ...visible].join('\n');
    }
    return `${title}\n${unit.textContent ?? ''}`;
  },
};
