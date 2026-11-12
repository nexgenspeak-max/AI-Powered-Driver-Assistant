package com.chinhtruongba.driverapp.demo

import android.content.Context
import com.chinhtruongba.driverapp.core.model.AccountSettings
import com.chinhtruongba.driverapp.core.model.ApiException
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.model.CreateTripRequest
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.DriverProfile
import com.chinhtruongba.driverapp.core.model.EarningsSummary
import com.chinhtruongba.driverapp.core.model.LatLng
import com.chinhtruongba.driverapp.core.model.NavigationRoute
import com.chinhtruongba.driverapp.core.model.RegisterResponse
import com.chinhtruongba.driverapp.core.model.RouteStep
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.VoiceToken
import com.chinhtruongba.driverapp.core.network.AuthApi
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.core.realtime.DispatchEvent
import com.chinhtruongba.driverapp.core.realtime.DispatchSocket
import com.chinhtruongba.driverapp.core.util.Geo
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.atan2
import kotlin.math.roundToInt

/**
 * Demo flavor backend (D9): every endpoint served from bundled JSON in `assets/demo`, with
 * in-memory mutations so the screens behave (toggle online, accept, advance, add trip…).
 * Timestamps written as `"@-90m"` are relative to app start so "Hôm nay" groups stay current.
 */
@Singleton
class FakeBackend @Inject constructor(@ApplicationContext private val context: Context) : AuthApi, TripApi, DispatchSocket {
    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false; coerceInputValues = true }
    private val now = Instant.now().truncatedTo(ChronoUnit.SECONDS)

    private fun load(name: String): String {
        val raw = context.assets.open("demo/$name").bufferedReader().use { it.readText() }
        return Regex("\"@(-?\\d+)m\"").replace(raw) { m ->
            "\"" + now.plus(m.groupValues[1].toLong(), ChronoUnit.MINUTES).toString() + "\""
        }
    }

    private var me: AuthUser = json.decodeFromString(load("me.json"))
    private var settings: AccountSettings = json.decodeFromString(load("settings.json"))
    private var ctx: DriverContext = json.decodeFromString(load("context.json"))
    private val earnings: Map<String, EarningsSummary> = json.decodeFromString(load("earnings.json"))
    private var tripSeq = 2420

    /** Events pushed to the fake WebSocket (deep link `driver-app://demo/offer`). */
    val socketEvents = MutableSharedFlow<DispatchEvent>(extraBufferCapacity = 8)

    private suspend fun latency() = delay(250)

    // ---- AuthApi ----
    override suspend fun login(body: JsonObject): AuthTokens {
        latency()
        val pw = body["password"]?.jsonPrimitive?.content.orEmpty()
        if (pw == "wrong-password") throw ApiException(401, "Sai số điện thoại hoặc mật khẩu")
        return AuthTokens("demo-access-${System.currentTimeMillis()}", "demo-refresh")
    }

    override suspend fun register(body: JsonObject): RegisterResponse {
        latency()
        fun s(k: String) = body[k]?.jsonPrimitive?.content
        me = me.copy(
            name = s("name") ?: me.name,
            phone = s("phone") ?: me.phone,
            email = s("email"),
            vehicleType = s("vehicle_type"),
            vehiclePlate = s("vehicle_plate"),
            vehicleName = s("vehicle_name"),
        )
        return RegisterResponse("demo-access", "demo-refresh", me)
    }

    override suspend fun me(): AuthUser {
        latency()
        return me.copy(status = ctx.driver.status)
    }

    override suspend fun updateAccount(id: String, body: JsonObject): AuthUser {
        latency()
        fun s(k: String) = body[k]?.jsonPrimitive?.content
        me = me.copy(
            name = s("name") ?: me.name,
            vehicleType = s("vehicle_type") ?: me.vehicleType,
            vehiclePlate = s("vehicle_plate") ?: me.vehiclePlate,
            vehicleName = s("vehicle_name") ?: me.vehicleName,
        )
        ctx = ctx.copy(driver = ctx.driver.copy(name = me.name, vehicleType = me.vehicleType, vehiclePlate = me.vehiclePlate, vehicleName = me.vehicleName))
        return me
    }

    override suspend fun settings(accountId: String): AccountSettings {
        latency()
        return settings
    }

    override suspend fun updateSettings(accountId: String, body: JsonObject): AccountSettings {
        latency()
        fun b(k: String) = body[k]?.jsonPrimitive?.booleanOrNull
        fun i(k: String) = body[k]?.jsonPrimitive?.doubleOrNull?.toInt()
        settings = settings.copy(
            handsFreeMode = b("hands_free_mode") ?: settings.handsFreeMode,
            notifyOnPickupApproach = b("notify_on_pickup_approach") ?: settings.notifyOnPickupApproach,
            notifyRadiusM = i("notify_on_pickup_approach_radius_m") ?: settings.notifyRadiusM,
            autoSuggestNextStop = b("auto_suggest_next_stop") ?: settings.autoSuggestNextStop,
            defaultCustomerCallMode = body["default_customer_call_mode"]?.jsonPrimitive?.content ?: settings.defaultCustomerCallMode,
        )
        return settings
    }

    // ---- TripApi ----
    override suspend fun updateDriver(phone: String, body: JsonObject): JsonObject {
        latency()
        body["status"]?.jsonPrimitive?.content?.let { st ->
            ctx = ctx.copy(driver = ctx.driver.copy(status = st))
            me = me.copy(status = st)
        }
        return buildJsonObject { put("phone", phone) }
    }

    override suspend fun context(fresh: Boolean?): DriverContext {
        latency()
        return ctx.copy(fetchedAt = Instant.now().toString())
    }

    override suspend fun profile(): DriverProfile = ctx.driverProfile

    override suspend fun earningsSummary(period: String): EarningsSummary {
        latency()
        return earnings[period] ?: EarningsSummary(period)
    }

    override suspend fun pushLocation(body: JsonObject): JsonObject = buildJsonObject { put("ok", true) }

    override suspend fun pushLiveLocation(body: JsonObject): JsonObject = buildJsonObject { put("ok", true) }

    override suspend fun navigation(fromLat: Double, fromLng: Double, toLat: Double, toLng: Double): NavigationRoute {
        delay(400)
        val path = ctx.optimizedRoute?.path.orEmpty()
        val from = LatLng(fromLat, fromLng)
        val to = LatLng(toLat, toLng)
        // Follow the bundled road path from the point nearest the driver to the point nearest
        // the destination, so the HUD shows real-looking turns without a network.
        val iFrom = path.indices.minByOrNull { Geo.distanceMeters(path[it], from) } ?: 0
        val iTo = path.indices.minByOrNull { Geo.distanceMeters(path[it], to) } ?: 0
        val pts = buildList {
            add(from)
            if (path.isNotEmpty()) {
                if (iFrom <= iTo) addAll(path.subList(iFrom, iTo + 1)) else addAll(path.subList(iTo, iFrom + 1).reversed())
            }
            add(to)
        }.distinct()
        val steps = pts.zipWithNext().mapIndexed { i, (a, b) ->
            val d = Geo.distanceMeters(a, b)
            val maneuver = if (i == 0) "straight" else turnBetween(pts[i - 1], a, b)
            RouteStep(
                instruction = "",
                maneuver = maneuver,
                distanceM = d,
                durationS = d / 6.5,
                startLocation = a,
                endLocation = b,
            )
        }
        val total = steps.sumOf { it.distanceM }
        return NavigationRoute(
            distanceKm = total / 1000,
            etaMinutes = (steps.sumOf { it.durationS } / 60).roundToInt().toDouble(),
            trafficNote = "Giao thông thông thoáng",
            polyline = encode(pts),
            steps = steps,
        )
    }

    private fun turnBetween(a: LatLng, b: LatLng, c: LatLng): String {
        val h1 = atan2(b.lng - a.lng, b.lat - a.lat)
        val h2 = atan2(c.lng - b.lng, c.lat - b.lat)
        var d = Math.toDegrees(h2 - h1)
        while (d > 180) d -= 360
        while (d < -180) d += 360
        return when {
            d > 30 -> "turn-right"
            d < -30 -> "turn-left"
            else -> "straight"
        }
    }

    private fun encode(points: List<LatLng>): String {
        val sb = StringBuilder()
        var pLat = 0
        var pLng = 0
        fun enc(v: Int) {
            var x = if (v < 0) (v shl 1).inv() else v shl 1
            while (x >= 0x20) {
                sb.append(((0x20 or (x and 0x1f)) + 63).toChar())
                x = x shr 5
            }
            sb.append((x + 63).toChar())
        }
        for (p in points) {
            val lat = Math.round(p.lat * 1e5).toInt()
            val lng = Math.round(p.lng * 1e5).toInt()
            enc(lat - pLat)
            enc(lng - pLng)
            pLat = lat
            pLng = lng
        }
        return sb.toString()
    }

    override suspend fun trip(id: String): Trip {
        latency()
        return allTrips().firstOrNull { it.tripId == id } ?: throw ApiException(404, "Không tìm thấy chuyến")
    }

    private fun allTrips() = ctx.upcomingTrips + ctx.activeTrips + ctx.completedTrips

    override suspend fun createTrip(body: CreateTripRequest): Trip {
        latency()
        val t = Trip(
            tripId = "T-${tripSeq++}",
            statusWire = "confirmed",
            driverPhone = ctx.driver.phone,
            customerName = body.customerName ?: "",
            customerPhone = body.customerPhone,
            pickupAddress = body.pickupAddress,
            dropoffAddress = body.dropoffAddress,
            pickupTime = Instant.now().toString(),
            bookedVia = "driver",
            note = body.note,
            hasBulkyGoods = body.hasBulkyGoods,
            withChildren = body.withChildren,
            createdAt = Instant.now().toString(),
            updatedAt = Instant.now().toString(),
            estimatedFare = 65000.0,
        )
        ctx = ctx.copy(activeTrips = ctx.activeTrips + t)
        return t
    }

    override suspend fun updateTrip(id: String, body: JsonObject): Trip {
        latency()
        val status = body["status"]?.jsonPrimitive?.content ?: throw ApiException(422, "status required")
        val trip = allTrips().firstOrNull { it.tripId == id } ?: throw ApiException(404, "Không tìm thấy chuyến")
        val updated = trip.copy(statusWire = status, updatedAt = Instant.now().toString())
        val upcoming = ctx.upcomingTrips.filterNot { it.tripId == id }
        var active = ctx.activeTrips.filterNot { it.tripId == id }
        var completed = ctx.completedTrips
        var today = ctx.todayEarnings
        when (status) {
            "confirmed", "arrived_pickup", "picked_up" -> active = (ctx.activeTrips.map { if (it.tripId == id) updated else it }
                .takeIf { l -> l.any { it.tripId == id } } ?: (active + updated))
            "completed" -> {
                completed = listOf(updated) + completed
                today = today.copy(totalEarnings = today.totalEarnings + (updated.estimatedFare ?: 0.0), tripCount = today.tripCount + 1)
            }
        }
        val stops = ctx.optimizedRoute?.let { r ->
            r.copy(
                stops = r.stops.filterNot { s ->
                    s.tripId == id && (status in setOf("completed", "cancelled_by_driver", "rejected") || (s.isPickup && status == "picked_up"))
                },
            )
        }
        ctx = ctx.copy(
            upcomingTrips = upcoming,
            activeTrips = active,
            completedTrips = completed,
            todayEarnings = today,
            currentTrip = active.firstOrNull(),
            optimizedRoute = stops?.takeIf { it.stops.size >= 1 },
        )
        return updated
    }

    override suspend fun voiceToken(phone: String, lang: String): VoiceToken {
        delay(300)
        return VoiceToken("demo-token", "driver-$phone-demo", "wss://demo.invalid")
    }

    // ---- DispatchSocket ----
    override fun events(phone: String): Flow<DispatchEvent> = flow {
        emit(DispatchEvent.Opened)
        socketEvents.collect { emit(it) }
    }

    /** Re-arm a ringing offer and push `trip_offer` (demo deep link). */
    fun triggerOffer() {
        val offer = ctx.upcomingTrips.firstOrNull { it.status.wire == "notified" } ?: Trip(
            tripId = "T-${tripSeq++}",
            statusWire = "notified",
            driverPhone = ctx.driver.phone,
            customerName = "Phạm Minh Anh",
            customerPhone = "0912345678",
            pickupAddress = "Times City, 458 Minh Khai, Hai Bà Trưng",
            dropoffAddress = "Sân bay Nội Bài, Sóc Sơn",
            pickupTime = Instant.now().plus(25, ChronoUnit.MINUTES).toString(),
            distanceKm = 31.4,
            etaMinutes = 48.0,
            trafficNote = "Đông xe trên cầu Nhật Tân",
            estimatedFare = 385000.0,
        ).also { ctx = ctx.copy(upcomingTrips = listOf(it) + ctx.upcomingTrips) }
        socketEvents.tryEmit(DispatchEvent.Message("trip_offer", buildJsonObject { put("trip_id", offer.tripId) }))
    }
}
