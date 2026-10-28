# Testing

## Automated

```bash
npm test
```

- `tests/matcher.test.ts`: matching rules, including false-positive cases.
- `tests/series-data.test.ts`: sanity checks on every file in `data/series/`.
- `tests/settings.test.ts`: the free/pro series gate and settings cleanup.
- `tests/reddit-adapter.test.ts`: the real shield on saved Reddit pages (offline).

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

### Reddit, old design (old.reddit.com)

- [ ] Listing page: spoiler titles are blurred.
- [ ] Self-post page: a spoiler post body is blurred.
- [ ] Comments and nested replies: same parent/reply rules as above.
- [ ] "load more comments": new comments are checked.
- [ ] Click to reveal doesn't follow the link.

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

### YouTube, Google, Goodreads

Not supported yet. Checklists get added with each adapter.
