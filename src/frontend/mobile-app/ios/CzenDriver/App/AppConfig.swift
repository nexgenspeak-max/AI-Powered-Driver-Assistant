import Foundation

/// Base URLs and keys from Info.plist (filled from `Config/Local.xcconfig`), plus launch options.
struct AppConfig: Sendable {
    var tripServiceURL: URL
    var authServiceURL: URL
    var webSocketURL: URL
    var goongMapsKey: String?
    var launch: LaunchOptions

    static func load(bundle: Bundle = .main, arguments: [String] = ProcessInfo.processInfo.arguments) -> AppConfig {
        func value(_ key: String) -> String? {
            let v = (bundle.object(forInfoDictionaryKey: key) as? String)?.trimmingCharacters(in: .whitespaces)
            return (v?.isEmpty == false) ? v : nil
        }
        let trip = URL(string: value("CZTripServiceURL") ?? "") ?? URL(string: "http://localhost:8002/api/v1")!
        let auth = URL(string: value("CZAuthServiceURL") ?? "") ?? URL(string: "http://localhost:8003/api/v1")!
        let ws = value("CZTripServiceWSURL").flatMap(URL.init(string:)) ?? deriveWebSocketURL(from: trip)
        return AppConfig(tripServiceURL: trip, authServiceURL: auth, webSocketURL: ws, goongMapsKey: value("CZGoongMapsKey"), launch: LaunchOptions(arguments: arguments))
    }

    /// http→ws, strip `/api/v1`, append `/ws`.
    static func deriveWebSocketURL(from api: URL) -> URL {
        var s = api.absoluteString
        if s.hasPrefix("https") { s = "wss" + s.dropFirst(5) } else if s.hasPrefix("http") { s = "ws" + s.dropFirst(4) }
        if s.hasSuffix("/") { s.removeLast() }
        if s.hasSuffix("/api/v1") { s.removeLast("/api/v1".count) }
        return URL(string: s + "/ws")!
    }

    var mapStyleURL: URL? {
        guard let key = goongMapsKey else { return nil }
        return URL(string: "https://tiles.goong.io/assets/goong_map_web.json?api_key=\(key)")
    }
}

/// Launch arguments. `-demo` swaps every client for bundled fakes; the rest steer demo screenshots
/// and UI tests (`-startTab trips`, `-tripsSegment pending`, `-openChat`, `-showOffer`,
/// `-route assistant-settings`, `-theme light`, `-signedOut`, `-authScreen login`).
struct LaunchOptions: Sendable {
    var demo = false
    var signedOut = false
    var authScreen: String?
    var startTab: String?
    var tripsSegment: String?
    var openChat = false
    var connectVoice = false
    var showOffer = false
    var route: String?
    var theme: String?
    var navigate = false
    var uiTesting = false

    init(arguments: [String] = []) {
        func arg(_ name: String) -> String? {
            guard let i = arguments.firstIndex(of: name), i + 1 < arguments.count else { return nil }
            return arguments[i + 1]
        }
        demo = arguments.contains("-demo")
        signedOut = arguments.contains("-signedOut")
        authScreen = arg("-authScreen")
        startTab = arg("-startTab")
        tripsSegment = arg("-tripsSegment")
        openChat = arguments.contains("-openChat")
        connectVoice = arguments.contains("-connectVoice")
        showOffer = arguments.contains("-showOffer")
        route = arg("-route")
        theme = arg("-theme")
        navigate = arguments.contains("-navigate")
        uiTesting = arguments.contains("-uiTesting")
    }
}
