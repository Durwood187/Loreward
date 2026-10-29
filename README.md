# Loreward

**Book spoiler shield for Reddit and Google, including Google's AI answers.**
Pick your series and the book you're on, and Loreward blurs anything online that could spoil
what comes next. Everything runs in your browser ([privacy policy](PRIVACY.md)).

**[Add Loreward to Chrome](https://chromewebstore.google.com/detail/loreward-book-spoiler-shi/lelhddhefkgdnhgkogijjikmabfhicda)** (free)

- **Sites:** Reddit (new and old), Google search (results, AI Overview, People also ask).
- **Series:** The Stormlight Archive and Mistborn. More are planned (see `docs/ROADMAP.md`).
- **How it's built:** Chrome extension (Manifest V3), plain TypeScript, esbuild. 100% local:
  no network calls, no analytics, no remote code.

## Setup

```bash
npm install       # first time, or after pulling changes
npm run build      # outputs dist/
npm test           # matcher + adapter tests (Vitest)
npm run typecheck  # TypeScript type check
```

Load it in Chrome: `chrome://extensions` → turn on **Developer mode** →
**Load unpacked** → pick the `dist/` folder. After rebuilding, click the reload
icon on the extension's card.

## How it's organized

| Path | What it is |
|---|---|
| `data/series/*.json` | One file per series: books, terms, allowlist. **Adding a series = adding a file + rebuild.** |
| `data/schema.json` | Describes the series file format. |
| `src/core/matcher.ts` | Decides whether text mentions a term from a later book. Pure logic, unit-tested. |
| `src/core/settings.ts` | What's saved in `chrome.storage` and the defaults (`isPro` lives here). |
| `src/content/` | Runs on supported sites: finds content units, blurs them, watches for new ones. |
| `src/content/adapters/` | One small file per site: which elements count as a "content unit". |
| `src/popup/` | The toolbar popup. |
| `scripts/build.mjs` | The whole build: bundles data, bundles scripts with esbuild, copies files to `dist/`. |
| `tests/` | Vitest tests; `tests/fixtures/` holds saved HTML so adapters can be tested offline. |

See `TESTING.md` for the manual checklist, `PERMISSIONS.md` for the permission justifications,
and `docs/PUBLISHING.md` for how to ship a release (`npm run package` builds the zip).

## About the term data

`data/series/stormlight.json` was drafted by an AI and checked against the Coppermind wiki
where possible (each term has `wikiChecked` and a `confidence`). It's marked
`"verified": true` now that the review calls in `docs/term-review.md` are settled.
The goal is a useful shield (about 90% right), not a perfect one.
