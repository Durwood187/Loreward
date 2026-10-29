# Publishing Loreward: step by step

The listing text you'll paste is in `docs/store/listing.md`, and the images are in `docs/store/`.

---

## Part 1: Before you push the repo (one-time decisions)

1. **Commit email.** ✅ Done: every commit uses durwood.extensions@gmail.com.
2. **License.** With no license file, the code is "look, don't reuse", which suits a paid product.
   Add an open-source license only if you want forks to be allowed.

## Part 2: Put the code on GitHub

1. On github.com → **New repository** → name `Loreward` → **Public** → leave "Add a README",
   ".gitignore" and "license" **unchecked** (the repo already has its files).
2. In Terminal:
   ```bash
   cd ~/"Spoiler Shield"
   git remote add origin https://github.com/<your-username>/Loreward.git
   git push -u origin main
   ```
3. Check that `https://github.com/<your-username>/Loreward/blob/main/PRIVACY.md` opens.
   That's your privacy policy URL.

## Part 3: Final checks (about 15 minutes)

1. `npm install` (first time on a fresh clone only), then `npm run package`.
   It runs every test, builds, and writes `loreward-0.1.0.zip`.
2. In Chrome: `chrome://extensions` → remove the dev copy → **Load unpacked** → `dist/`.
   Run the **First run**, **Reddit** and **Google** sections of `TESTING.md` once.
3. **Reddit screenshot** (the one store image Claude can't make, because Reddit blocks its browser):
   with book 1 selected, open a busy r/Stormlight_Archive thread where a few comments are blurred,
   take a screenshot (Cmd+Shift+4, then drag over the page), and send it to Claude. It comes back
   framed as `docs/store/screenshot-3-reddit.png`. You can also skip it: four screenshots are fine.

## Part 4: Developer account (one-time)

1. Go to the Chrome Web Store developer dashboard: https://chrome.google.com/webstore/devconsole
2. Sign in with the Google account that should own the listing.
3. Pay the **one-time $5 registration fee**.
4. Turn on **2-Step Verification** for that Google account if it isn't on yet (required to publish).
5. **Account** tab: verify your contact email, and answer the **trader / non-trader** question.
   For a free extension, *non-trader* is the usual answer. When you start charging (Pro), you must
   switch to *trader*, and EU users can then see the business address and phone number you provide.

## Part 5: Create the listing

1. Dashboard → **New item** → upload `loreward-0.1.0.zip`.
2. **Store listing** tab: paste and upload everything from `docs/store/listing.md` (description,
   category, icon, screenshots, promo tile, homepage and support URLs). Replace `<your-username>`.
3. **Privacy practices** tab: paste the single-purpose text and the permission justifications,
   answer "No remote code", tick no data types, tick the three certifications, and paste the
   privacy policy URL.
4. **Distribution** tab: Free, Public, all regions.
5. **Submit for review.** In the submit dialog you can choose to publish automatically once it's
   approved, or to publish it yourself after approval. Either is fine.

## Part 6: Review

- Review usually takes from a few days to a couple of weeks. You'll get an email either way.
- **If it's rejected**, the email names the policy. Common first-time issues are a permission
  justification that's too vague, the privacy answers not matching the privacy policy, or
  description wording. Send Claude the email text. Fixes are usually quick.
- **After approval**: install it from the store on a clean Chrome profile and run the First run
  checks once more. Then add the store link to `README.md`.

## Shipping updates later

1. Bump `"version"` in `src/manifest.json` (e.g. 0.1.0 → 0.2.0). The store rejects a reused version.
2. `npm run package` → upload the new zip on the item's **Package** tab → **Submit for review**.
3. Adding a new site (YouTube, say) adds a permission. Chrome will ask existing users to approve it,
   and some will skip that, so batch new sites into fewer releases.

## Microsoft Edge (same zip, free)

1. Go to Microsoft Partner Center (https://partner.microsoft.com/dashboard/microsoftedge/overview)
   and register as an Edge extension developer. It's free; use durwood.extensions@gmail.com.
2. **Create new extension** → upload the same `loreward-<version>.zip`.
3. Fill in the listing from `docs/store/listing.md`. The fields are nearly the same as Chrome's, and
   the same screenshots and icon work.
4. Submit. Edge reviews separately, so expect a few business days. Updates work the same way:
   upload the new zip and resubmit.

## Website (GitHub Pages, free)

The `docs/` folder doubles as a small public site: a landing page and the
"How to stop Google's AI from spoiling books" article, which can bring in readers through Google search.

1. Replace `STORE_LINK` and `<your-username>` in `docs/index.md` and `docs/stop-google-ai-spoilers.md`
   (Claude can do this once you share the links).
2. On GitHub: **Settings → Pages → Build and deployment → Deploy from a branch** → `main` / `/docs` → Save.
3. After a minute or two, the site is at `https://<your-username>.github.io/Loreward/`, and the article
   at `.../stop-google-ai-spoilers`.
4. Put the site address in the Chrome listing's **Homepage URL**.
