# Roadmap

## Now: first release (free, one series)
1. ✅ Name: **Loreward** (store title "Loreward: Book Spoiler Shield"). ✅ Icon.
2. ✅ First-run setup: a welcome tab on install.
3. ✅ Store listing package: `docs/store/` + `docs/PUBLISHING.md`.
4. Submit. While it's in review, start the next series.

## Then
- Payments via ExtensionPay once a second series exists (Pro = more than one series).
- YouTube adapter (next site after Reddit + Google).

## Series order (revised Oct 2026)
Ongoing series (new books coming, active fandoms) first; long-finished classics last.
1. The Stormlight Archive ✅
2. Mistborn ✅ (0.2.0)
3. Rest of the Cosmere: deferred. Mostly standalones, which need chapter-level progress to protect well.
   Realm of the Elderlings ✅ (0.3.0, requested by a creator)
4. Fourth Wing (The Empyrean) ✅ (0.3.0)
5. Dungeon Crawler Carl ✅ (0.3.0)
6. Empire of the Vampire ✅ (0.4.0)
   A Court of Thorns and Roses ✅ (0.4.1, timed for the book 6 release)
7. Red Rising ✅ (0.5.0, draft: terms + events from the fandom wiki; BookTok demand)
   The Will of the Many ✅ (0.6.0, draft; no fan wiki yet, checked against Wikipedia)
   Throne of Glass ✅ (0.6.0, draft; publication order)
8. Harry Potter
9. Eragon (Inheritance Cycle)
10. Percy Jackson
11. Sword of Truth
12. Codex Alera
    The Dresden Files (big Reddit/audiobook fanbase, 17 books of twists)
13. The Lord of the Rings

Each series: AI-drafted terms per book, checked against the series wiki, short review list of
judgment calls for Eric (see docs/term-review.md for the Stormlight example).

## Site ideas (Nov 2026)
- Google AI Mode ✅ (0.4.0)
- Web versions of AI chats (gemini.google.com, chatgpt.com, claude.ai): blur replies that name later-book
  terms. Needs new host permissions; replies stream in; layouts change often. Gauge demand first.
- Discord in the browser: book-club servers. New host permission.
- Text messages / phone chat apps: not possible (iOS and Android don't let extensions or apps read other apps).

## Pricing plan (updated 17 Nov 2026, Eric)
- **Chrome: free** for now (one series at a time, free switching). Revisit with usage data.
- **iPhone/Safari: free** = one series, with everything Loreward does on every supported site.
  (Promised publicly to a creator: "the first series stays free".) First pick is confirmed; one quiet
  switch is offered only when someone tries another series. ✅ built (docs/ios-pro.md)
- **Loreward Pro (iPhone): one-time $4.99**, Family Sharing on. Every series at once, "Not started yet"
  for a TBR, and every series added later. Launch buyers keep everything even if paid bundles come
  later (Apple's purchase date tells us who they are). ✅ built, needs Xcode build + App Store Connect
- **Later Pro ideas:** chapter-level progress, YouTube comments and X (Safari), AI chat sites, Discord.
- **Bundles:** revisit at ~25+ series (genre packs + an all-access option).

## Growth: sharing, offer codes, reviews (planned Nov 2026)
Word of mouth matters more than features: spoilers are a social problem, so make sharing easy.
- [ ] **Share prompt** after setup and in the popup: "Know someone reading this series? Send them
      Loreward." iPhone: system share sheet with the App Store link; Chrome: copy the store link.
- [ ] **"Protect your book club"** angle in the store listings and videos.
- [ ] **Offer codes** (App Store Connect → In-App Purchases → Offer Codes): free Pro codes for
      BookTokers, book clubs and helpful commenters. Track who got which batch.
- [ ] **Review prompts.** iPhone: Apple's own review prompt only (requestReview), shown at a good moment,
      e.g. after a week of use and some blurred spoilers; Apple limits it to 3 times a year and doesn't
      allow custom "rate us" pop-ups. Chrome: keep the existing one-time prompt after 7 days.
      Don't ask "Enjoying Loreward?" first and send only happy users to the store ("review gating"):
      Apple and Google both discourage it, and it can get an app rejected.
- [ ] **Store listing refresh** with 0.7.0: lead with Reddit and Google search, Google's AI answers as one
      part (not the headline); consider "Book Spoiler Blocker for Reddit & Google" as the Chrome title.

## Event rules (in progress)

Catch plain-word spoilers about early characters ("Carl gets convicted", "Teft dies"): a subject name near a cue word, tagged to the book it happens in. Blurred for readers on that book or earlier.
- [x] Matcher support + tests
- [x] Stormlight pilot catalog (52 events) — review: docs/event-review-stormlight.md
- [ ] Eric reviews Stormlight events; test on r/Stormlight_Archive for false blurs
- [ ] Popup: "finished the series" option (otherwise last-book events stay blurred)
- [x] Mistborn (29 events, needs review: docs/event-review-mistborn.md)
- [x] The Empyrean (22 events, needs review: docs/event-review-the-empyrean.md)
- [x] Empire of the Vampire (18 events, DRAFT: no reviewer; wiki covers book 1 only, so unconfirmed events sit in book 3)
- [x] Realm of the Elderlings (49 events, DRAFT: no reviewer; Wikipedia plot checks, Rain Wilds thin)
- [x] ACOTAR (27 events; book 6 is new, mostly catch-all until the wiki fills in)
- [x] Dungeon Crawler Carl (23 events, DRAFT: Eric is mid-series, can't review)
- [x] Rechecked Empyrean (26) and Elderlings (53) against their fandom wikis
- [ ] Revisit ACOTAR book 6 and Empire of the Vampire as their wikis fill in
- Sources and wiki quality: docs/wiki-sources.md Note: Eric can't review events for series he hasn't finished (the list IS the spoilers).
- [ ] Generic backstop: series name + "ending / last chapter / final scene"
