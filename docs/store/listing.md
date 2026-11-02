# Chrome Web Store listing: copy and paste

Every field the developer dashboard asks for, in the order you'll see them.

---

## Package tab

Upload `loreward-<version>.zip` (made by `npm run package`).

---

## Store listing tab

**Title** (comes from the manifest, so there's nothing to type): Loreward: Book Spoiler Shield

**Summary** (comes from the manifest, 132 characters max):
> Hides book spoilers on Reddit and Google search, including Google's AI answers, based on how far you've read. 100% private.

**Description** (paste everything between the lines):

> Don't list series names here. Version 0.4.0 was rejected (Nov 2026) for "excessive and/or irrelevant
> keywords", pointing at the series list. The list lives on the website (docs/index.md) and in the popup.

---
Google's AI answers spoil books. Loreward stops them.

Search for a character in the series you're reading and Google's AI Overview may cheerfully tell you how their story ends, before you've decided you want to know. Reddit threads, search snippets and "People also ask" boxes do the same.

Loreward knows how far you've read. Pick your series and the book you're on, and it blurs anything that could spoil what comes next. Click any blurred item to reveal just that one.

WHAT IT BLURS
• Posts, comments and search results that mention characters, places or events from books you haven't reached yet
• Google's AI Overview, AI Mode and "People also ask" answers on searches about your series. AI answers spoil with facts, not just names, so Loreward holds them back until you click
• Search results and posts about the book you're reading right now, which could give away its ending

CLEAR LABELS, SO YOU CAN DECIDE
• "Spoilers past [your book]": names something from a later book
• "May spoil books after [your book]": talks about a later book
• "May spoil [your book]": talks about the book you're reading
• "May contain spoilers for [series]": an AI answer about your series

WORKS ON
• Reddit (new and old)
• Google search (results, AI Overview, AI Mode, People also ask)
More sites are coming.

WHICH SERIES?
Loreward covers a growing list of popular fantasy series. Open the extension to see the full list and pick yours. The list is also on the homepage linked from this page.

PRIVATE BY DESIGN
• Everything runs in your browser. No accounts, no tracking, no data sent anywhere.
• Only two permissions: storage for your settings, and access to the sites it protects.

Loreward is an independent project and isn't affiliated with any author or publisher.
---

**Category:** Lifestyle → Entertainment

**Language:** English

**Store icon:** `docs/store/store-icon-128.png`

**Screenshots** (1280×800, in this order): `docs/store/screenshot-1-ai-overview.png`, `screenshot-2-search-results.png`, `screenshot-3-reddit.png` (yours, see PUBLISHING.md), `screenshot-4-welcome.png`, `screenshot-5-popup.png`

**Small promo tile** (440×280): `docs/store/promo-small-440x280.png`

**Homepage URL:** https://durwood187.github.io/Loreward/ (once GitHub Pages is on; until then https://github.com/Durwood187/Loreward)

**Support URL:** https://github.com/Durwood187/Loreward/issues

---

## Privacy practices tab

**Single purpose description:**
> Loreward hides possible book spoilers on supported websites (Reddit and Google search), based on the book series and book the user says they are reading.

**Permission justifications:**

| Permission | Justification |
|---|---|
| storage | Saves the user's chosen series, current book and on/off switches on their device. |
| Host permissions (reddit.com, google.com/search) | Needed to read and blur posts, comments, search results and AI answers on these sites that may contain spoilers. Limited to Google *search* pages, not other Google sites. |

**Are you using remote code?** No, I am not using remote code.

**Data usage:** tick **none** of the data types. Loreward reads page text only in the browser to decide what to blur and never stores or transmits it, so it doesn't "collect" data in the store's sense.
*(If a reviewer pushes back, the honest alternative is to tick "Website content" and add: "Read locally to decide what to blur; never stored or transmitted.")*

**Certifications:** tick all three (no selling data, no unrelated use, no creditworthiness/lending use).

**Privacy policy URL:** https://github.com/Durwood187/Loreward/blob/main/PRIVACY.md

---

## Distribution tab

**Payments:** Free
**Visibility:** Public
**Regions:** All regions
