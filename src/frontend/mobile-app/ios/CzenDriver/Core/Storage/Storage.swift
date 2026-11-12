import Foundation
import Security

/// Persists the auth tokens. Live: Keychain (parity with expo-secure-store `driver-auth-tokens`).
protocol TokenStore: Sendable {
    func load() -> AuthTokens?
    func save(_ tokens: AuthTokens?)
}

struct KeychainTokenStore: TokenStore {
    var service = "com.chinhtruongba.driverapp"
    var account = "driver-auth-tokens"

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
        SecItemDelete(query as CFDictionary)
        guard let tokens, let data = try? JSONEncoder().encode(tokens) else { return }
        var q = query
        q[kSecValueData as String] = data
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        SecItemAdd(q as CFDictionary, nil)
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
