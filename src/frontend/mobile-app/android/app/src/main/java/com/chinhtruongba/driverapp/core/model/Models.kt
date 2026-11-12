package com.chinhtruongba.driverapp.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LatLng(val lat: Double, val lng: Double)

@Serializable
data class AuthTokens(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
)

@Serializable
data class AuthUser(
    val id: String,
    val role: String = "driver",
    val permissions: List<String> = emptyList(),
    val name: String = "",
    val phone: String? = null,
    val email: String? = null,
    val status: String = "offline",
    @SerialName("vehicle_type") val vehicleType: String? = null,
    @SerialName("vehicle_plate") val vehiclePlate: String? = null,
    @SerialName("vehicle_name") val vehicleName: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
) {
    /** The app maps `locked` to `offline` (parity-map §2). */
    val isOnline: Boolean get() = status == "online"
}

@Serializable
data class RegisterResponse(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    val user: AuthUser? = null,
)

@Serializable
data class AccountSettings(
    @SerialName("id_account") val idAccount: String = "",
    @SerialName("hands_free_mode") val handsFreeMode: Boolean = false,
    @SerialName("notify_on_pickup_approach") val notifyOnPickupApproach: Boolean = false,
    @SerialName("notify_on_pickup_approach_radius_m") val notifyRadiusM: Int = 1000,
    @SerialName("auto_suggest_next_stop") val autoSuggestNextStop: Boolean = false,
    @SerialName("auto_suggest_next_stop_radius_m") val autoSuggestRadiusM: Int = 500,
    @SerialName("default_customer_call_mode") val defaultCustomerCallMode: String = "agent",
    @SerialName("updated_at") val updatedAt: String? = null,
    @SerialName("updated_by") val updatedBy: String? = null,
)

enum class TripStatus(val wire: String) {
    Pending("pending"), Notified("notified"), Calling("calling"), Confirmed("confirmed"),
    Rejected("rejected"), NoAnswer("no_answer"), ArrivedPickup("arrived_pickup"), PickedUp("picked_up"),
    Completed("completed"), Cancelled("cancelled"), CancelledByDriver("cancelled_by_driver"), NoShow("no_show"),
    Unknown("unknown");

    companion object {
        fun of(wire: String): TripStatus = entries.firstOrNull { it.wire == wire } ?: Unknown
    }
}

@Serializable
data class Trip(
    @SerialName("trip_id") val tripId: String,
    @SerialName("status") val statusWire: String,
    @SerialName("driver_phone") val driverPhone: String = "",
    @SerialName("customer_name") val customerName: String = "",
    @SerialName("customer_phone") val customerPhone: String = "",
    @SerialName("pickup_address") val pickupAddress: String = "",
    @SerialName("dropoff_address") val dropoffAddress: String = "",
    @SerialName("pickup_lat") val pickupLat: Double? = null,
    @SerialName("pickup_lng") val pickupLng: Double? = null,
    @SerialName("dropoff_lat") val dropoffLat: Double? = null,
    @SerialName("dropoff_lng") val dropoffLng: Double? = null,
    @SerialName("pickup_time") val pickupTime: String = "",
    @SerialName("booked_via") val bookedVia: String = "",
    @SerialName("distance_km") val distanceKm: Double? = null,
    @SerialName("eta_minutes") val etaMinutes: Double? = null,
    @SerialName("traffic_note") val trafficNote: String = "",
    @SerialName("route_summary") val routeSummary: String = "",
    val note: String? = null,
    @SerialName("has_bulky_goods") val hasBulkyGoods: Boolean? = null,
    @SerialName("with_children") val withChildren: Boolean? = null,
    @SerialName("room_name") val roomName: String = "",
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
    @SerialName("estimated_fare") val estimatedFare: Double? = null,
) {
    val status: TripStatus get() = TripStatus.of(statusWire)
    val pickup: LatLng? get() = if (pickupLat != null && pickupLng != null) LatLng(pickupLat, pickupLng) else null
    val dropoff: LatLng? get() = if (dropoffLat != null && dropoffLng != null) LatLng(dropoffLat, dropoffLng) else null
}

@Serializable
data class CreateTripRequest(
    @SerialName("customer_phone") val customerPhone: String,
    @SerialName("pickup_address") val pickupAddress: String,
    @SerialName("dropoff_address") val dropoffAddress: String,
    @SerialName("customer_name") val customerName: String? = null,
    val note: String? = null,
    @SerialName("has_bulky_goods") val hasBulkyGoods: Boolean? = null,
    @SerialName("with_children") val withChildren: Boolean? = null,
    @SerialName("booked_via") val bookedVia: String = "driver",
)

@Serializable
data class DriverProfile(
    val phone: String = "",
    val rating: Double = 0.0,
    @SerialName("acceptance_rate") val acceptanceRate: Double = 0.0,
    @SerialName("completion_rate") val completionRate: Double = 0.0,
    @SerialName("total_trips") val totalTrips: Int = 0,
)

@Serializable
data class TodayEarnings(
    @SerialName("total_earnings") val totalEarnings: Double = 0.0,
    @SerialName("trip_count") val tripCount: Int = 0,
    @SerialName("bonus_earnings") val bonusEarnings: Double = 0.0,
    @SerialName("hours_online") val hoursOnline: Double = 0.0,
    val currency: String = "VND",
)

@Serializable
data class EarningsSummary(
    val period: String,
    @SerialName("total_earnings") val totalEarnings: Double = 0.0,
    @SerialName("trip_count") val tripCount: Int = 0,
    val currency: String = "VND",
)

@Serializable
data class Bonus(val description: String = "", val amount: String = "", @SerialName("expires_at") val expiresAt: String = "")

@Serializable
data class Driver(
    val id: String = "",
    val phone: String = "",
    val name: String = "",
    val email: String? = null,
    val status: String = "offline",
    @SerialName("vehicle_type") val vehicleType: String? = null,
    @SerialName("vehicle_plate") val vehiclePlate: String? = null,
    @SerialName("vehicle_name") val vehicleName: String? = null,
)

@Serializable
data class OptimizedRouteStop(
    @SerialName("trip_id") val tripId: String,
    val kind: String,
    val address: String = "",
    @SerialName("customer_name") val customerName: String = "",
    val lat: Double,
    val lng: Double,
    @SerialName("distance_m") val distanceM: Double = 0.0,
    @SerialName("eta_minutes") val etaMinutes: Double = 0.0,
) {
    val isPickup: Boolean get() = kind == "pickup"
    val latLng: LatLng get() = LatLng(lat, lng)
}

@Serializable
data class OptimizedRoute(
    val stops: List<OptimizedRouteStop> = emptyList(),
    val source: String = "goong_matrix",
    @SerialName("cost_basis") val costBasis: String? = null,
    @SerialName("total_distance_m") val totalDistanceM: Double? = null,
    @SerialName("total_duration_s") val totalDurationS: Double? = null,
    @SerialName("computed_at") val computedAt: String = "",
    @SerialName("driver_location") val driverLocation: LatLng? = null,
    val path: List<LatLng> = emptyList(),
)

@Serializable
data class CurrentLocation(val lat: Double, val lng: Double, @SerialName("updated_at") val updatedAt: String = "")

@Serializable
data class LastCall(@SerialName("call_id") val callId: String, val summary: String? = null)

@Serializable
data class DriverContext(
    val driver: Driver = Driver(),
    @SerialName("driver_profile") val driverProfile: DriverProfile = DriverProfile(),
    @SerialName("today_earnings") val todayEarnings: TodayEarnings = TodayEarnings(),
    @SerialName("active_bonuses") val activeBonuses: List<Bonus> = emptyList(),
    @SerialName("upcoming_trips") val upcomingTrips: List<Trip> = emptyList(),
    @SerialName("active_trips") val activeTrips: List<Trip> = emptyList(),
    @SerialName("completed_trips") val completedTrips: List<Trip> = emptyList(),
    @SerialName("current_trip") val currentTrip: Trip? = null,
    @SerialName("current_location") val currentLocation: CurrentLocation? = null,
    @SerialName("has_pending_nudge") val hasPendingNudge: Boolean = false,
    @SerialName("last_call") val lastCall: LastCall? = null,
    @SerialName("optimized_route") val optimizedRoute: OptimizedRoute? = null,
    @SerialName("fetched_at") val fetchedAt: String = "",
)

@Serializable
data class RouteStep(
    val instruction: String = "",
    val maneuver: String = "",
    @SerialName("distance_m") val distanceM: Double = 0.0,
    @SerialName("duration_s") val durationS: Double = 0.0,
    @SerialName("start_location") val startLocation: LatLng,
    @SerialName("end_location") val endLocation: LatLng,
    val polyline: String? = null,
)

@Serializable
data class NavigationRoute(
    @SerialName("distance_km") val distanceKm: Double? = null,
    @SerialName("eta_minutes") val etaMinutes: Double? = null,
    @SerialName("traffic_note") val trafficNote: String = "",
    val polyline: String = "",
    val steps: List<RouteStep> = emptyList(),
)

@Serializable
data class VoiceToken(val token: String, @SerialName("room_name") val roomName: String, @SerialName("livekit_url") val livekitUrl: String)

@Serializable
data class ApiErrorBody(val detail: String? = null)

/** A tagged API failure carrying the HTTP status and the server's `detail`. */
class ApiException(val code: Int, val detail: String?, cause: Throwable? = null) : Exception(detail ?: "HTTP $code", cause)

enum class VoiceLang(val routing: String) {
    Vn("vn"), En("en");

    companion object {
        /** Coerce persisted / deep-link values; "vi" maps to vn, unknown → default vn. */
        fun resolve(raw: String?): VoiceLang {
            val t = raw?.trim()?.lowercase() ?: return Vn
            if (t == "vi") return Vn
            return entries.firstOrNull { it.routing == t } ?: Vn
        }
    }
}

enum class ThemeMode { Light, Dark }
