import SwiftUI

@main
struct CzenDriverApp: App {
    @State private var model: AppModel
    @State private var wakeWord: WakeWordService

    init() {
        let config = AppConfig.load()
        let model = AppModelFactory.make(config: config)
        _model = State(initialValue: model)
        _wakeWord = State(initialValue: WakeWordService(model: model, enabled: !config.launch.demo))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(model.prefs)
                .environment(model.chat)
                .environment(model.voice)
                .environment(model.location)
                .environment(wakeWord)
        }
    }
}

enum AppModelFactory {
    @MainActor
    static func make(config: AppConfig) -> AppModel {
        let launch = config.launch
        if launch.demo {
            let backend = DemoBackend()
            let store = MemoryTokenStore(launch.signedOut ? nil : AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh"))
            let session = AuthSession(store: store) { _ in AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh") }
            let defaults = UserDefaults(suiteName: "czen-demo") ?? .standard
            if launch.uiTesting { defaults.removePersistentDomain(forName: "czen-demo") }
            let prefs = Preferences(defaults: defaults)
            if let theme = launch.theme.flatMap(Preferences.ThemeMode.init(rawValue:)) { prefs.theme = theme }
            let socket = DemoDispatchSocket()
            if launch.showOffer { socket.offerOnStart = "trip-offer-01" }
            return AppModel(config: config, auth: backend, api: backend, session: session, prefs: prefs,
                            voiceEngine: DemoVoiceEngine(fast: launch.uiTesting), socket: socket, audio: FillerAudio(enabled: false))
        }
        let transport = URLSessionTransport()
        let authBase = config.authServiceURL
        let session = AuthSession(store: KeychainTokenStore()) { refresh in
            // Bare call (not through HTTPClient) so a refresh can never recurse into itself.
            var req = URLRequest(url: authBase.appendingPathComponent("auth/refresh"))
            req.httpMethod = "POST"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refresh])
            let (data, response) = try await transport.send(req)
            guard (200..<300).contains(response.statusCode) else { throw APIError.unauthorized }
            return try JSONCoding.decoder().decode(AuthTokens.self, from: data)
        }
        let authHTTP = HTTPClient(baseURL: config.authServiceURL, transport: transport, session: session, sendsDriverPhone: false)
        let apiHTTP = HTTPClient(baseURL: config.tripServiceURL, transport: transport, session: session, sendsDriverPhone: true)
        let prefs = Preferences()
        if let theme = launch.theme.flatMap(Preferences.ThemeMode.init(rawValue:)) { prefs.theme = theme }
        return AppModel(config: config, auth: LiveAuthAPI(http: authHTTP), api: LiveDriverAPI(http: apiHTTP), session: session,
                        prefs: prefs, voiceEngine: LiveKitVoiceEngine(), socket: LiveDispatchSocket(baseURL: config.webSocketURL),
                        audio: FillerAudio())
    }
}
