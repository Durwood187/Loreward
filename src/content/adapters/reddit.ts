// Reddit adapter: covers new Reddit (www/sh) and old Reddit (old.reddit.com).
//
// New Reddit is built from custom elements:
//   <shreddit-post post-title="…">            one post (feed card or post page)
//   <shreddit-comment>                         one comment; replies are nested inside it
//     <div slot="comment">…</div>              ← just this comment's own text
//     <shreddit-comment slot="children">…      ← replies (not part of the unit)
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
    'shreddit-comment > [slot="comment"]',
    '.thing.link > .entry',
    '.thing.comment > .entry',
  ].join(', '),
  getText(unit) {
    // Feed cards sometimes keep the title only in an attribute.
    const title = unit.getAttribute('post-title') ?? '';
    return `${title}\n${unit.textContent ?? ''}`;
  },
};
