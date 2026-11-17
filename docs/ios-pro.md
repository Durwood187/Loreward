# Loreward Pro on iPhone

**Free:** one series of the reader's choice. The first pick asks for confirmation. One switch is offered (quietly, only when they try another series); after that, other series need Pro.
**Pro:** one-time purchase, $4.99, product id `com.durwoodextensions.Loreward.pro` (non-consumable). Unlocks every series, including future ones. Chrome stays free.

## How it fits together

| Piece | Where | What it does |
|---|---|---|
| Rules | `src/core/entitlement.ts` (tested) | First pick, one switch, Pro |
| Dialogs | `src/ui/gate.ts` | Shown in the popup and welcome page (Safari build only) |
| Bridge | `src/core/native.ts` | Asks the app for Pro; saves the free choice |
| Extension handler | `safari/…/SafariWebExtensionHandler.swift` | Free choice in the Keychain (survives reinstall); Pro from StoreKit, App Group flag as backup |
| Purchase | `safari/…/ViewController.swift` + `Main.html` | Unlock Pro / Restore buttons on the app screen |

`npm run build:safari` turns the gate on and adds the `nativeMessaging` permission. **Always use it before running in Xcode.** `npm run build` / `npm run package` are the Chrome builds and never include the gate.

## Testing in the Simulator (before the paid Apple account)

1. `npm run build:safari`
2. In Xcode, drag `safari/Loreward/Loreward.storekit` into the project navigator. Don't tick any target.
3. Product → Scheme → Edit Scheme → Run → Options → **StoreKit Configuration: Loreward.storekit**.
4. Pick an **iPhone Simulator** as the run destination and press ▶.
5. In the app: **Unlock Pro** shows a simulated purchase sheet. Debug → StoreKit → Manage Transactions lets you refund or delete purchases to test again.
6. In the Simulator's Settings → Apps → Safari → Extensions, turn Loreward on. In Safari, open google.com, open the Loreward popup and try:
   - first pick → "Make … your free series?"
   - another series → "Switch your free series to …? You can only switch once."
   - a third → "… needs Loreward Pro"
   - after buying Pro → any series, no dialogs

**Known unknown:** the extension checks Pro with StoreKit directly. If the Simulator's test purchases aren't visible to the extension, Pro will only show up once the App Groups capability is on (see below). The free-tier flow can be tested either way.

## After the paid account is approved

1. Signing & Capabilities → **+ Capability → App Groups** on **both** targets → add `group.com.durwoodextensions.Loreward`.
2. App Store Connect → the app → **In-App Purchases** → New → Non-Consumable, product id `com.durwoodextensions.Loreward.pro`, price $4.99, text from `docs/store/app-store.md`.
3. Test on your phone with a Sandbox account (Settings → Developer → Sandbox Apple Account).
