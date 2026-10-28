# Testing

## Automated

```bash
npm test
```

- `tests/matcher.test.ts`: matching rules, including false-positive cases.
- `tests/series-data.test.ts`: sanity checks on every file in `data/series/`.
- `tests/settings.test.ts`: the free/pro series gate and settings cleanup.
- `tests/reddit-adapter.test.ts`: the real shield on saved Reddit pages (offline).
- `tests/google-adapter.test.ts`: the real shield on a saved Google results page (offline).

### Refreshing the Reddit fixtures

`tests/fixtures/reddit-*.html` were **hand-written** to mirror Reddit's structure.
Reddit changes its markup, so swap in real pages now and then:

1. Open a thread, then **File → Save Page As… → "Webpage, HTML Only"**.
2. Trim it to a few posts and comments. Add `data-test="…"` attributes matching the
   names used in `reddit-adapter.test.ts`, and keep `<meta charset="utf-8">`.
3. Run `npm test`. If tests fail and the live checklist below also fails, update
   the selectors in `src/content/adapters/reddit.ts`.

## Manual checklist (run before each release)

**Setup:** `npm run build`, then reload the extension in `chrome://extensions`. In the
popup, pick the series and **book 1** (that blurs the most, so it's the easiest to see).

Good test thread: any busy thread in the series' subreddit. To check that the
shield blurs, write a test comment in a private draft, or search the subreddit
for a later-book name.

### Reddit, new design (www.reddit.com)

- [ ] **Feed:** post cards mentioning later-book names are blurred with the label "Possible spoiler past *The Way of Kings* — click to reveal".
- [ ] **Label wording:** the label never shows the spoiler word itself.
- [ ] **Post page:** the post body is blurred when it mentions a later term.
- [ ] **Comments:** a spoiler comment is blurred, but its **parent** is not.
- [ ] **Replies:** a spoiler reply is blurred, but its **safe parent** is not; a safe reply under a blurred parent stays readable.
- [ ] **Click to reveal:** clicking a blurred post reveals it and does **not** open the post. Clicking it again then works normally.
- [ ] **Infinite scroll:** scroll the feed for about 30 seconds. New cards are checked and blurred.
- [ ] **"More replies":** expanding collapsed comment threads checks the new comments.
- [ ] **Navigation without reload:** go from the feed into a post and back. Content is still checked.
- [ ] **Search results** (search inside the subreddit): result cards are checked. *Known gap if not.*
- [ ] **No flash:** on a hard reload of a spoiler-heavy thread, spoiler text isn't readable before the blur appears. A brief flicker is acceptable; readable text is not.
- [ ] **Performance:** scrolling a 500+ comment thread feels as smooth as with the extension off.

- [ ] **Book names** (set the popup to book 2): a post or comment naming *Words of Radiance* gets the
      **amber** "May spoil Words of Radiance (the book you're reading)" label; one naming a later book
      ("Rhythm of War", or "RoW" inside the series subreddit) gets "May spoil books after…".
- [ ] Posts naming only earlier books stay readable.

### Reddit, old design (old.reddit.com)

- [ ] Listing page: spoiler titles are blurred.
- [ ] Self-post page: a spoiler post body is blurred.
- [ ] Comments and nested replies: same parent/reply rules as above.
- [ ] "load more comments": new comments are checked.
- [ ] Click to reveal doesn't follow the link.

### First run

- [ ] Remove the extension, load it again: a **welcome tab** opens by itself.
- [ ] Picking a series + book there shows "✓ Saved", and Reddit/Google blur immediately (no reload needed).
- [ ] Reloading an already-installed extension does **not** open the welcome tab again.

### Popup

- [ ] Series → book → the blur updates **without reloading** the page.
- [ ] Moving to a later book unblurs terms you've now reached.
- [ ] Master switch off: every blur disappears. On: they come back.
- [ ] "Shield on Reddit" off: blurs disappear on Reddit only. The setting survives a browser restart.
- [ ] "Reveal all on this page (N)": the count matches the blurred items, and clicking it clears them.
- [ ] On a non-Reddit tab, the popup says "SpoilerShield doesn't run on this page."
- [ ] "Draft term list" note shows while `verified` is false.
- [ ] Dark mode: the popup is readable.

### Privacy (once per release)

- [ ] DevTools → Network on a Reddit page: the extension makes **no** requests.
- [ ] `chrome://extensions` → Details: the only permissions listed are storage and reddit.com.

### Google search (www.google.com/search)

Labels (strongest first):
- **solid** "Spoilers past *book*": a name/term from a later book appears.
- **outlined** "May spoil books after *book*": a later book's title or abbreviation (WoR, RoW…) appears.
- **amber** "May spoil *book* (the book you're reading)": your current book is named.
- **outlined** "May contain spoilers for *series*": an AI answer on a series search, naming no book.

- [ ] Series search ("what happens to kaladin in wind and truth"): the **AI Overview** is blurred with the outlined label, and no words show while it types out.
- [ ] Unrelated search ("how tall is the eiffel tower"): the AI Overview shows normally.
- [ ] **Regular results** with a later-book name are blurred (solid label).
- [ ] Set to book 2, search "words of radiance chapter 86": results about it get the **amber** label.
- [ ] Same search: a result naming a later book (e.g. "Wind and Truth", "RoW") gets "May spoil books after…".
- [ ] Results naming only earlier books stay readable.
- [ ] Unrelated search with a look-alike abbreviation ("ob gyn near me") is untouched.
- [ ] **People also ask:** questions with a later-book name are blurred; other questions are readable.
- [ ] Opening a question: its answer appears **already blurred** (no flash), with a label. Closed questions show no labels.
- [ ] Revealing a question does **not** reveal its answer.
- [ ] Clicking a blurred result reveals it and does **not** open the link.
- [ ] Popup on a Google results page says "Shield on Google Search", and switching it off clears blurs on Google only.
- [ ] Other Google pages (Gmail, Maps, google.com home page) are untouched.

### YouTube, Goodreads

Not supported yet. Checklists get added with each adapter.
