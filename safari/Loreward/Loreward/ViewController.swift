//
//  ViewController.swift
//  Loreward
//
//  The app's one screen: setup steps plus the Loreward Pro purchase.
//  Pro is a one-time, non-consumable purchase (StoreKit 2). The Safari extension
//  checks it itself (see SafariWebExtensionHandler.swift); we also record it in
//  the shared App Group as a backup once that capability is turned on.
//

import UIKit
import WebKit
import StoreKit

let proProductID = "com.durwoodextensions.Loreward.pro"
let appGroupID = "group.com.durwoodextensions.Loreward"

class ViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {

    @IBOutlet var webView: WKWebView!

    private var product: Product?
    private var updates: Task<Void, Never>?

    override func viewDidLoad() {
        super.viewDidLoad()

        self.webView.navigationDelegate = self
        self.webView.scrollView.isScrollEnabled = true  // the welcome page is taller than a phone screen

        self.webView.configuration.userContentController.add(self, name: "controller")

        self.webView.loadFileURL(Bundle.main.url(forResource: "Main", withExtension: "html")!, allowingReadAccessTo: Bundle.main.resourceURL!)

        // Purchases can finish outside the app (Ask to Buy, another device, refunds).
        updates = Task { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let transaction) = result { await transaction.finish() }
                await self?.refresh()
            }
        }
    }

    deinit { updates?.cancel() }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Task {
            product = try? await Product.products(for: [proProductID]).first
            await refresh()
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        Task {
            switch type {
            case "buy": await buy()
            case "restore":
                show(note: "Checking your purchases…")
                try? await AppStore.sync()
                await refresh(note: "Restore finished.")
            default: break
            }
        }
    }

    // MARK: - Pro

    private func buy() async {
        guard let product else { show(note: "The App Store isn't reachable right now. Try again in a moment."); return }
        do {
            switch try await product.purchase() {
            case .success(let result):
                if case .verified(let transaction) = result { await transaction.finish() }
                await refresh()
            case .pending:
                show(note: "Waiting for approval. Pro unlocks as soon as it's approved.")
            default:
                break  // cancelled
            }
        } catch {
            show(note: "The purchase didn't go through. Please try again.")
        }
    }

    /// Re-checks Pro, records it for the extension, and updates the page.
    private func refresh(note: String? = nil) async {
        var pro = false
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, t.productID == proProductID, t.revocationDate == nil { pro = true }
        }
        UserDefaults(suiteName: appGroupID)?.set(pro, forKey: "isPro")
        show(pro: pro, note: note)
    }

    private func show(pro: Bool? = nil, note: String? = nil) {
        var state: [String: Any] = [:]
        if let pro { state["pro"] = pro }
        if let price = product?.displayPrice { state["price"] = price }
        if let note { state["note"] = note }
        guard let data = try? JSONSerialization.data(withJSONObject: state),
              let json = String(data: data, encoding: .utf8) else { return }
        webView.evaluateJavaScript("setProState(\(json))")
    }
}
