import Foundation

/// Demo mode backend: serves every endpoint from `Resources/Demo/demo-data.json` with in-memory
/// mutations (online toggle, trip status changes, settings), no network.
actor DemoBackend: AuthAPI, DriverAPI {
    private struct Seed: Decodable {
        var anchor: String
        var me: AuthUser
        var settings: AccountSettings
        var earnings: [String: EarningsSummary]
        var context: DriverContext
        var navigation: NavigationRoute
    }

    private var user: AuthUser
    private var settings: AccountSettings
    private var earnings: [String: EarningsSummary]
    private var context: DriverContext
    private var navigationRoute: NavigationRoute
    private let latency: Duration

    init(bundle: Bundle = .main, latency: Duration = .milliseconds(250), now: Date = Date()) {
        let url = bundle.url(forResource: "demo-data", withExtension: "json")!
        // Bundled fixture: a decode failure is a programming error.
        let seed = try! JSONCoding.decoder().decode(Seed.self, from: Data(contentsOf: url))
        user = seed.me
        settings = seed.settings
        earnings = seed.earnings
        navigationRoute = seed.navigation
        navigationRoute.polyline = Geo.encodePolyline([seed.navigation.steps[0].startLocation] + seed.navigation.steps.map(\.endLocation))
        self.latency = latency
        context = DemoBackend.rebase(seed.context, anchor: seed.anchor, now: now)
    }

    /// Shifts every timestamp by whole days so "Hôm nay"/"Hôm qua" groups stay meaningful.
    private static func rebase(_ ctx: DriverContext, anchor: String, now: Date) -> DriverContext {
        guard let a = Fmt.parseISO(anchor) else { return ctx }
        let cal = Calendar.current
        let days = cal.dateComponents([.day], from: cal.startOfDay(for: a), to: cal.startOfDay(for: now)).day ?? 0
        guard days != 0 else { return ctx }
        let f = ISO8601DateFormatter()
        func shift(_ s: String?) -> String? {
            guard let s, let d = Fmt.parseISO(s), let moved = cal.date(byAdding: .day, value: days, to: d) else { return s }
            return f.string(from: moved)
        }
        func shiftTrip(_ t: Trip) -> Trip {
            var t = t
            t.updatedAt = shift(t.updatedAt)
            t.createdAt = shift(t.createdAt)
            if t.pickupTime?.contains("T") == true { t.pickupTime = shift(t.pickupTime) }
            return t
        }
        var out = ctx
        out.completedTrips = ctx.completedTrips.map(shiftTrip)
        out.activeTrips = ctx.activeTrips.map(shiftTrip)
        out.upcomingTrips = ctx.upcomingTrips.map(shiftTrip)
        return out
    }

    private func wait() async throws { try await Task.sleep(for: latency) }

    // MARK: AuthAPI

    func login(phone: String, password: String) async throws -> AuthTokens {
        try await wait()
        if password == "wrong" { throw APIError.http(status: 401, detail: "Invalid credentials") }
        return AuthTokens(accessToken: "demo-access", refreshToken: "demo-refresh")
    }

    func register(_ input: RegisterInput) async throws -> RegisterResponse {
        try await wait()
        user.name = input.name
        user.phone = input.phone
        user.email = input.email
        user.vehicleType = input.vehicleType
        user.vehiclePlate = input.vehiclePlate
        user.vehicleName = input.vehicleName
        return RegisterResponse(accessToken: "demo-access", refreshToken: "demo-refresh", user: user)
    }

    func me() async throws -> AuthUser { try await wait(); return user }

    func updateAccount(id: String, name: String) async throws -> AuthUser {
        try await wait(); user.name = name; context.driver?.name = name; return user
    }

    func updateVehicle(id: String, type: String, plate: String, name: String) async throws -> AuthUser {
        try await wait()
        user.vehicleType = type; user.vehiclePlate = plate; user.vehicleName = name
        return user
    }

    func settings(accountId: String) async throws -> AccountSettings { try await wait(); return settings }

    func patchSettings(accountId: String, _ patch: AccountSettingsPatch) async throws -> AccountSettings {
        try await wait(); settings = patch.applied(to: settings); return settings
    }

    // MARK: DriverAPI

    func setStatus(phone: String, online: Bool) async throws {
        try await wait()
        user.status = online ? "online" : "offline"
        context.driver?.status = user.status
    }

    func context(fresh: Bool) async throws -> DriverContext { try await wait(); return context }

    func earningsSummary(period: String) async throws -> EarningsSummary {
        try await wait()
        guard let e = earnings[period] else { throw APIError.http(status: 404, detail: nil) }
        return e
    }

    func pushLocation(_ point: LatLng) async throws {}
    func pushLiveLocation(_ point: LatLng, scope: String?) async throws {}

    func navigation(from: LatLng, to: LatLng) async throws -> NavigationRoute { try await wait(); return navigationRoute }

    func trip(id: String) async throws -> Trip {
        try await wait()
        let all = context.upcomingTrips + context.activeTrips + context.completedTrips
        guard let t = all.first(where: { $0.tripId == id }) else { throw APIError.http(status: 404, detail: "Không tìm thấy chuyến") }
        return t
    }

    func createTrip(_ input: CreateTripInput) async throws -> Trip {
        try await wait()
        let now = ISO8601DateFormatter().string(from: Date())
        let trip = Trip(tripId: "walkup-\(UUID().uuidString.prefix(6))", status: .confirmed, driverPhone: user.phone,
                        customerName: input.customerName, customerPhone: input.customerPhone,
                        pickupAddress: input.pickupAddress, dropoffAddress: input.dropoffAddress,
                        pickupTime: now, bookedVia: "driver", distanceKm: 3.5, etaMinutes: 12, trafficNote: "Đường thông thoáng",
                        note: input.note, hasBulkyGoods: input.hasBulkyGoods, withChildren: input.withChildren,
                        createdAt: now, updatedAt: now, estimatedFare: 65000)
        context.activeTrips.append(trip)
        return trip
    }

    func updateTrip(id: String, status: TripStatus, at: LatLng?) async throws -> Trip {
        try await wait()
        if let i = context.upcomingTrips.firstIndex(where: { $0.tripId == id }) {
            var t = context.upcomingTrips.remove(at: i)
            t.status = status
            if status == .confirmed { context.activeTrips.append(t) }
            return t
        }
        guard let i = context.activeTrips.firstIndex(where: { $0.tripId == id }) else { throw APIError.http(status: 404, detail: nil) }
        var t = context.activeTrips[i]
        t.status = status
        t.updatedAt = ISO8601DateFormatter().string(from: Date())
        switch status {
        case .completed:
            context.activeTrips.remove(at: i)
            context.completedTrips.insert(t, at: 0)
            context.todayEarnings?.totalEarnings += t.estimatedFare ?? 0
            context.todayEarnings?.tripCount += 1
            context.optimizedRoute?.stops.removeAll { $0.tripId == id }
        case .cancelledByDriver:
            context.activeTrips.remove(at: i)
            context.optimizedRoute?.stops.removeAll { $0.tripId == id }
        default:
            context.activeTrips[i] = t
            if status == .pickedUp { context.optimizedRoute?.stops.removeAll { $0.tripId == id && $0.kind == "pickup" } }
        }
        return t
    }

    func voiceToken(phone: String, lang: String) async throws -> VoiceToken {
        try await wait()
        return VoiceToken(token: "demo", roomName: "driver-\(phone)-demo", livekitUrl: "wss://demo.invalid")
    }
}
