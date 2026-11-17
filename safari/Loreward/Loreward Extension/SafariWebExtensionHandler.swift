//
//  SafariWebExtensionHandler.swift
//  Loreward Extension
//
//  Answers the extension's two questions (see src/core/native.ts):
//    getEntitlement  → { isPro, freeSeries, switchUsed }
//    saveFreeChoice  → stores { freeSeries, switchUsed }, returns { ok }
//
//  The free-series choice lives in the Keychain, which survives deleting and
//  reinstalling the app. Pro comes from the App Store (StoreKit), with the app's
//  App Group flag as a backup.
//

import SafariServices
import StoreKit
import Security
import os.log

private let proProductID = "com.durwoodextensions.Loreward.pro"
private let appGroupID = "group.com.durwoodextensions.Loreward"

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message: Any?
        if #available(iOS 15.0, macOS 11.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = request?.userInfo?["message"]
        }
        let body = message as? [String: Any] ?? [:]

        Task {
            let reply: [String: Any]
            switch body["type"] as? String {
            case "getEntitlement":
                let choice = FreeChoice.load()
                reply = ["isPro": await Self.isPro(),
                         "freeSeries": choice.series ?? NSNull(),
                         "switchUsed": choice.switchUsed]
            case "saveFreeChoice":
                let series = body["freeSeries"] as? String
                let switchUsed = body["switchUsed"] as? Bool ?? false
                reply = ["ok": FreeChoice.save(series: series, switchUsed: switchUsed)]
            default:
                reply = ["error": "unknown request"]
            }
            let response = NSExtensionItem()
            if #available(iOS 15.0, macOS 11.0, *) {
                response.userInfo = [SFExtensionMessageKey: reply]
            } else {
                response.userInfo = ["message": reply]
            }
            context.completeRequest(returningItems: [response], completionHandler: nil)
        }
    }

    private static func isPro() async -> Bool {
        if UserDefaults(suiteName: appGroupID)?.bool(forKey: "isPro") == true { return true }
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, t.productID == proProductID, t.revocationDate == nil { return true }
        }
        return false
    }
}

/// The free-series choice, kept in the Keychain so a reinstall doesn't reset it.
private enum FreeChoice {
    static let service = "com.durwoodextensions.Loreward.free-series"
    static let account = "choice"

    static func load() -> (series: String?, switchUsed: Bool) {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecAttrAccount as String: account,
                                    kSecReturnData as String: true]
        var out: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data,
              let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return (nil, false) }
        return (dict["series"] as? String, dict["switchUsed"] as? Bool ?? false)
    }

    static func save(series: String?, switchUsed: Bool) -> Bool {
        let dict: [String: Any] = ["series": series ?? NSNull(), "switchUsed": switchUsed]
        guard let data = try? JSONSerialization.data(withJSONObject: dict) else { return false }
        let match: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
                                    kSecAttrService as String: service,
                                    kSecAttrAccount as String: account]
        let update: [String: Any] = [kSecValueData as String: data]
        var status = SecItemUpdate(match as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var add = match
            add[kSecValueData as String] = data
            add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
            status = SecItemAdd(add as CFDictionary, nil)
        }
        if status != errSecSuccess { os_log(.error, "Loreward: couldn't save free choice (%d)", status) }
        return status == errSecSuccess
    }
}
