import Foundation

/// Identity service (`/api/v1/auth`, `/accounts`, `/settings`).
protocol AuthAPI: Sendable {
    func login(phone: String, password: String) async throws -> AuthTokens
    func register(_ input: RegisterInput) async throws -> RegisterResponse
    func me() async throws -> AuthUser
    func updateAccount(id: String, name: String) async throws -> AuthUser
    func updateVehicle(id: String, type: String, plate: String, name: String) async throws -> AuthUser
    func settings(accountId: String) async throws -> AccountSettings
    func patchSettings(accountId: String, _ patch: AccountSettingsPatch) async throws -> AccountSettings
}

/// External-api service (`/api/v1/drivers`, `/trips`, `/voice/token`).
protocol DriverAPI: Sendable {
    func setStatus(phone: String, online: Bool) async throws
    func context(fresh: Bool) async throws -> DriverContext
    func earningsSummary(period: String) async throws -> EarningsSummary
    func pushLocation(_ point: LatLng) async throws
    func pushLiveLocation(_ point: LatLng, scope: String?) async throws
    func navigation(from: LatLng, to: LatLng) async throws -> NavigationRoute
    func trip(id: String) async throws -> Trip
    func createTrip(_ input: CreateTripInput) async throws -> Trip
    func updateTrip(id: String, status: TripStatus, at: LatLng?) async throws -> Trip
    func voiceToken(phone: String, lang: String) async throws -> VoiceToken
}

struct LiveAuthAPI: AuthAPI {
    let http: HTTPClient

    private struct LoginBody: Encodable { var role = "driver"; var phone: String; var password: String }
    private struct NameBody: Encodable { var name: String }
    private struct VehicleBody: Encodable { var vehicleType: String; var vehiclePlate: String; var vehicleName: String }

    func login(phone: String, password: String) async throws -> AuthTokens {
        try await http.decode(AuthTokens.self, "POST", "auth/login", body: LoginBody(phone: phone, password: password), authorized: false)
    }

    func register(_ input: RegisterInput) async throws -> RegisterResponse {
        try await http.decode(RegisterResponse.self, "POST", "auth/register", body: input, authorized: false)
    }

    func me() async throws -> AuthUser { try await http.decode(AuthUser.self, "GET", "auth/me") }

    func updateAccount(id: String, name: String) async throws -> AuthUser {
        try await http.decode(AuthUser.self, "PATCH", "accounts/\(id)", body: NameBody(name: name))
    }

    func updateVehicle(id: String, type: String, plate: String, name: String) async throws -> AuthUser {
        try await http.decode(AuthUser.self, "PATCH", "accounts/\(id)", body: VehicleBody(vehicleType: type, vehiclePlate: plate, vehicleName: name))
    }

    func settings(accountId: String) async throws -> AccountSettings {
        try await http.decode(AccountSettings.self, "GET", "settings/\(accountId)")
    }

    func patchSettings(accountId: String, _ patch: AccountSettingsPatch) async throws -> AccountSettings {
        try await http.decode(AccountSettings.self, "PATCH", "settings/\(accountId)", body: patch)
    }
}

struct LiveDriverAPI: DriverAPI {
    let http: HTTPClient

    private struct StatusBody: Encodable { var status: String }
    private struct LocationBody: Encodable { var lat: Double; var lng: Double; var proximityScope: String? }
    private struct TripPatch: Encodable { var status: String; var lat: Double?; var lng: Double? }

    func setStatus(phone: String, online: Bool) async throws {
        _ = try await http.request("PATCH", "drivers/\(phone)", body: StatusBody(status: online ? "online" : "offline"))
    }

    func context(fresh: Bool) async throws -> DriverContext {
        try await http.decode(DriverContext.self, "GET", "drivers/me/context", query: fresh ? [URLQueryItem(name: "fresh", value: "true")] : [])
    }

    func earningsSummary(period: String) async throws -> EarningsSummary {
        try await http.decode(EarningsSummary.self, "GET", "drivers/me/earnings/summary", query: [URLQueryItem(name: "period", value: period)])
    }

    func pushLocation(_ point: LatLng) async throws {
        _ = try await http.request("POST", "drivers/me/location", body: LocationBody(lat: point.lat, lng: point.lng, proximityScope: nil))
    }

    func pushLiveLocation(_ point: LatLng, scope: String?) async throws {
        _ = try await http.request("POST", "drivers/me/location/live", body: LocationBody(lat: point.lat, lng: point.lng, proximityScope: scope))
    }

    func navigation(from: LatLng, to: LatLng) async throws -> NavigationRoute {
        try await http.decode(NavigationRoute.self, "GET", "drivers/me/navigation", query: [
            URLQueryItem(name: "from_lat", value: String(from.lat)), URLQueryItem(name: "from_lng", value: String(from.lng)),
            URLQueryItem(name: "to_lat", value: String(to.lat)), URLQueryItem(name: "to_lng", value: String(to.lng)),
        ])
    }

    func trip(id: String) async throws -> Trip { try await http.decode(Trip.self, "GET", "trips/\(id)") }

    func createTrip(_ input: CreateTripInput) async throws -> Trip {
        try await http.decode(Trip.self, "POST", "trips", body: input)
    }

    func updateTrip(id: String, status: TripStatus, at: LatLng?) async throws -> Trip {
        try await http.decode(Trip.self, "PATCH", "trips/\(id)", body: TripPatch(status: status.rawValue, lat: at?.lat, lng: at?.lng))
    }

    func voiceToken(phone: String, lang: String) async throws -> VoiceToken {
        try await http.decode(VoiceToken.self, "POST", "voice/token", query: [URLQueryItem(name: "driver_phone", value: phone), URLQueryItem(name: "lang", value: lang)])
    }
}
