import Foundation

// Wire models for the identity and external-api services (parity map §2). Decoded with
// `convertFromSnakeCase`, so property names are the camelCase of the JSON keys.

struct AuthTokens: Codable, Equatable, Sendable {
    var accessToken: String
    var refreshToken: String
}

struct AuthUser: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var role: String?
    var permissions: [String]?
    var name: String
    var phone: String?
    var email: String?
    var status: String?
    var vehicleType: String?
    var vehiclePlate: String?
    var vehicleName: String?
    var createdAt: String?
    var updatedAt: String?

    /// `locked` maps to offline.
    var isOnline: Bool { status == "online" }
}

struct RegisterResponse: Codable, Sendable {
    var accessToken: String
    var refreshToken: String
    var user: AuthUser?
}

enum TripStatus: String, Codable, Sendable, CaseIterable {
    case pending, notified, calling, confirmed, rejected
    case noAnswer = "no_answer"
    case arrivedPickup = "arrived_pickup"
    case pickedUp = "picked_up"
    case completed, cancelled
    case cancelledByDriver = "cancelled_by_driver"
    case noShow = "no_show"
    case unknown

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = TripStatus(rawValue: raw) ?? .unknown
    }

    var label: String {
        switch self {
        case .pending: "Chờ gán tài xế"
        case .notified: "Chuyến mới"
        case .calling: "Đang gọi bạn"
        case .confirmed: "Đã nhận"
        case .rejected: "Đã từ chối"
        case .noAnswer: "Không trả lời"
        case .arrivedPickup: "Đã đến điểm đón"
        case .pickedUp: "Đang chở khách"
        case .completed: "Hoàn thành"
        case .cancelled: "Khách đã huỷ"
        case .cancelledByDriver: "Bạn đã huỷ"
        case .noShow: "Khách vắng mặt"
        case .unknown: "—"
        }
    }

    static let pendingSet: Set<TripStatus> = [.pending, .notified, .calling]
}

struct Trip: Codable, Equatable, Sendable, Identifiable, Hashable {
    var tripId: String
    var status: TripStatus
    var driverPhone: String?
    var customerName: String?
    var customerPhone: String?
    var pickupAddress: String
    var dropoffAddress: String
    var pickupLat: Double?
    var pickupLng: Double?
    var dropoffLat: Double?
    var dropoffLng: Double?
    var pickupTime: String?
    var bookedVia: String?
    var distanceKm: Double?
    var etaMinutes: Double?
    var trafficNote: String?
    var routeSummary: String?
    var note: String?
    var hasBulkyGoods: Bool?
    var withChildren: Bool?
    var roomName: String?
    var createdAt: String?
    var updatedAt: String?
    var estimatedFare: Double?

    var id: String { tripId }
    var pickup: LatLng? { pickupLat.flatMap { lat in pickupLng.map { LatLng(lat: lat, lng: $0) } } }
    var dropoff: LatLng? { dropoffLat.flatMap { lat in dropoffLng.map { LatLng(lat: lat, lng: $0) } } }
    var displayName: String { (customerName?.isEmpty == false ? customerName : nil) ?? "Khách" }
}

struct DriverProfile: Codable, Equatable, Sendable {
    var phone: String?
    var rating: Double?
    var acceptanceRate: Double?
    var completionRate: Double?
    var totalTrips: Int?
}

struct TodayEarnings: Codable, Equatable, Sendable {
    var totalEarnings: Double
    var tripCount: Int
    var bonusEarnings: Double?
    var hoursOnline: Double?
    var currency: String?
}

struct EarningsSummary: Codable, Equatable, Sendable {
    var period: String
    var totalEarnings: Double
    var tripCount: Int
    var currency: String?
}

struct Bonus: Codable, Equatable, Sendable {
    var description: String?
    var amount: String?
    var expiresAt: String?
}

struct OptimizedRouteStop: Codable, Equatable, Sendable, Hashable {
    var tripId: String
    var kind: String // pickup | dropoff
    var address: String
    var customerName: String?
    var lat: Double
    var lng: Double
    var distanceM: Double?
    var etaMinutes: Double?

    var coordinate: LatLng { LatLng(lat: lat, lng: lng) }
    var isPickup: Bool { kind == "pickup" }
}

struct OptimizedRoute: Codable, Equatable, Sendable {
    var stops: [OptimizedRouteStop]
    var source: String
    var costBasis: String?
    var totalDistanceM: Double?
    var totalDurationS: Double?
    var computedAt: String?
    var driverLocation: LatLng?
    var path: [LatLng]?
}

struct CurrentLocation: Codable, Equatable, Sendable {
    var lat: Double
    var lng: Double
    var updatedAt: String?
}

struct LastCall: Codable, Equatable, Sendable {
    var callId: String
    var summary: String?
}

struct DriverInfo: Codable, Equatable, Sendable {
    var phone: String?
    var name: String?
    var status: String?
}

struct DriverContext: Codable, Equatable, Sendable {
    var driver: DriverInfo?
    var driverProfile: DriverProfile?
    var todayEarnings: TodayEarnings?
    var activeBonuses: [Bonus]?
    var upcomingTrips: [Trip]
    var activeTrips: [Trip]
    var completedTrips: [Trip]
    var currentTrip: Trip?
    var currentLocation: CurrentLocation?
    var hasPendingNudge: Bool?
    var lastCall: LastCall?
    var optimizedRoute: OptimizedRoute?
    var fetchedAt: String?
}

struct RouteStep: Codable, Equatable, Sendable {
    var instruction: String
    var maneuver: String
    var distanceM: Double
    var durationS: Double
    var startLocation: LatLng
    var endLocation: LatLng
    var polyline: String?
}

struct NavigationRoute: Codable, Equatable, Sendable {
    var distanceKm: Double?
    var etaMinutes: Double?
    var trafficNote: String?
    var polyline: String
    var steps: [RouteStep]
}

struct AccountSettings: Codable, Equatable, Sendable {
    var idAccount: String?
    var handsFreeMode: Bool
    var notifyOnPickupApproach: Bool
    var notifyOnPickupApproachRadiusM: Int
    var autoSuggestNextStop: Bool
    var autoSuggestNextStopRadiusM: Int
    var defaultCustomerCallMode: String
    var updatedAt: String?
    var updatedBy: String?
}

/// Partial update for PATCH /settings/{id}; nil fields are omitted.
struct AccountSettingsPatch: Encodable, Sendable, Equatable {
    var handsFreeMode: Bool?
    var notifyOnPickupApproach: Bool?
    var notifyOnPickupApproachRadiusM: Int?
    var autoSuggestNextStop: Bool?
    var defaultCustomerCallMode: String?

    func applied(to s: AccountSettings) -> AccountSettings {
        var out = s
        if let v = handsFreeMode { out.handsFreeMode = v }
        if let v = notifyOnPickupApproach { out.notifyOnPickupApproach = v }
        if let v = notifyOnPickupApproachRadiusM { out.notifyOnPickupApproachRadiusM = v }
        if let v = autoSuggestNextStop { out.autoSuggestNextStop = v }
        if let v = defaultCustomerCallMode { out.defaultCustomerCallMode = v }
        return out
    }
}

struct VoiceToken: Codable, Equatable, Sendable {
    var token: String
    var roomName: String
    var livekitUrl: String
}

struct CreateTripInput: Encodable, Sendable, Equatable {
    var customerPhone: String
    var pickupAddress: String
    var dropoffAddress: String
    var customerName: String?
    var note: String?
    var hasBulkyGoods: Bool?
    var withChildren: Bool?
    var bookedVia = "driver"
}

struct RegisterInput: Encodable, Sendable, Equatable {
    var role = "driver"
    var phone: String
    var name: String
    var email: String
    var password: String
    var vehicleType: String
    var vehiclePlate: String
    var vehicleName: String
}

enum VehicleType: String, CaseIterable, Identifiable, Sendable {
    case motorbike, car4 = "car_4", car7 = "car_7", truck
    var id: String { rawValue }
    var label: String {
        switch self {
        case .motorbike: "Xe máy"
        case .car4: "Ô tô 4 chỗ"
        case .car7: "Ô tô 7 chỗ"
        case .truck: "Xe tải"
        }
    }
    static func label(for raw: String?) -> String? { raw.flatMap { VehicleType(rawValue: $0)?.label } }
}

enum JSONCoding {
    static func decoder() -> JSONDecoder {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }

    static func encoder() -> JSONEncoder {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }
}
