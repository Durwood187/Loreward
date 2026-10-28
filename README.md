# SpoilerShield (working name)

A Chrome extension (Manifest V3) for fantasy readers. You pick a series and the
book you're on, and it blurs posts and comments on supported sites that mention
names, places or events from *later* books.

v1: one series (compatible with *The Stormlight Archive*), one site (Reddit).
100% local: no network calls, no analytics, no remote code.

## Setup

First time only (the dev tools couldn't be installed while scaffolding, so
they aren't pinned in `package.json` yet; this adds them and writes the lockfile):

```bash
npm install --save-dev esbuild typescript vitest jsdom @types/chrome
```

Then, as usual:

```bash
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

See `TESTING.md` for the manual checklist and `PERMISSIONS.md` for the store-listing
permission justifications.

## About the term data

`data/series/stormlight.json` is an **unreviewed draft** (`"verified": false`).
The term list and its book assignments were drafted by an AI and are often
wrong. Every term has a `confidence` field, and every term needs a human check
before release.
