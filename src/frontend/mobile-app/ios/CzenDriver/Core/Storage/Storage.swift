import Foundation
import os
import Security

/// Persists the auth tokens. Live: Keychain (parity with expo-secure-store `driver-auth-tokens`).
protocol TokenStore: Sendable {
    func load() -> AuthTokens?
    func save(_ tokens: AuthTokens?)
}

struct KeychainTokenStore: TokenStore {
    var service = "com.chinhtruongba.driverapp"
    var account = "driver-auth-tokens"

    /// UserDefaults key that marks "this install already ran". UserDefaults go away with the app,
    /// Keychain items do not — so a missing marker means a fresh (re)install.
    static let installMarkerKey = "keychain-tokens.install-marker"
    private static let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "keychain")

    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account]
    }

    func load() -> AuthTokens? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return try? JSONDecoder().decode(AuthTokens.self, from: data)
    }

    func save(_ tokens: AuthTokens?) {
        let status = write(tokens)
        // Only the OSStatus is logged — never the token payload.
        if status != errSecSuccess { Self.log.error("keychain \(tokens == nil ? "delete" : "write", privacy: .public) failed: OSStatus \(status, privacy: .public)") }
    }

    /// Writes (update in place, add when missing) or deletes the tokens; returns the Keychain status.
    @discardableResult
    func write(_ tokens: AuthTokens?) -> OSStatus {
        guard let tokens else {
            let status = SecItemDelete(query as CFDictionary)
            return status == errSecItemNotFound ? errSecSuccess : status
        }
        guard let data = try? JSONEncoder().encode(tokens) else { return errSecParam }
        let attributes: [String: Any] = [kSecValueData as String: data,
                                         kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            status = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
        }
        return status
    }

    /// First launch after (re)install: drop tokens a previous install left in the Keychain, then
    /// set the marker so later launches keep the session.
    func resetIfFreshInstall(defaults: UserDefaults = .standard) {
        guard !defaults.bool(forKey: Self.installMarkerKey) else { return }
        save(nil)
        defaults.set(true, forKey: Self.installMarkerKey)
    }
}

/// In-memory store for demo mode and tests.
final class MemoryTokenStore: TokenStore, @unchecked Sendable {
    // Safe: all access goes through `lock`.
    private let lock = NSLock()
    private var tokens: AuthTokens?
    init(_ tokens: AuthTokens? = nil) { self.tokens = tokens }
    func load() -> AuthTokens? { lock.withLock { tokens } }
    func save(_ tokens: AuthTokens?) { lock.withLock { self.tokens = tokens } }
}

/// Local preferences (MMKV parity): theme, voice language, wake word.
@MainActor
@Observable
final class Preferences {
    enum ThemeMode: String { case light, dark }
    enum VoiceLang: String, CaseIterable { case vn, en }

    private let defaults: UserDefaults

    var theme: ThemeMode { didSet { defaults.set(theme.rawValue, forKey: Keys.theme) } }
    var voiceLang: VoiceLang { didSet { defaults.set(voiceLang.rawValue, forKey: Keys.voiceLang) } }
    var wakeWordEnabled: Bool { didSet { defaults.set(wakeWordEnabled, forKey: Keys.wakeWord) } }

    enum Keys {
        static let theme = "theme-settings.mode"
        static let voiceLang = "voice-lang-settings.lang"
        static let wakeWord = "wakeword-settings.enabled"
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        theme = ThemeMode(rawValue: defaults.string(forKey: Keys.theme) ?? "") ?? .dark
        voiceLang = Preferences.resolveLang(defaults.string(forKey: Keys.voiceLang))
        wakeWordEnabled = defaults.bool(forKey: Keys.wakeWord)
    }

    /// "vi" maps to vn; unknown → vn.
    nonisolated static func resolveLang(_ raw: String?) -> VoiceLang {
        let t = (raw ?? "").trimmingCharacters(in: .whitespaces).lowercased()
        if t == "vi" { return .vn }
        return VoiceLang(rawValue: t) ?? .vn
    }
}
