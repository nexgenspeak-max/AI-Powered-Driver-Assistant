package com.chinhtruongba.driverapp.app

import com.chinhtruongba.driverapp.core.data.ApplicationScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.realtime.DispatchEvent
import com.chinhtruongba.driverapp.core.realtime.DispatchSocket
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import com.chinhtruongba.driverapp.feature.voice.ChatStore
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Hooks the RN `(app)` layout mounts while signed in: useDispatchSocket, useAutoConnectOnNudge,
 * usePushLocationOnNewTrip and the context bootstrap. Started once from the Application.
 */
@Singleton
class AppCoordinator @Inject constructor(
    private val session: SessionRepository,
    private val drivers: DriverRepository,
    private val socket: DispatchSocket,
    private val offers: TripOfferStore,
    private val location: LocationTracker,
    private val voice: VoiceSession,
    private val chat: ChatStore,
    @param:ApplicationScope private val scope: CoroutineScope,
) {
    private var started = false
    private var socketJob: Job? = null

    fun start() {
        if (started) return
        started = true

        // ['driverContext'] is enabled once ['me'] is loaded.
        scope.launch {
            session.me.map { it.data?.id }.distinctUntilChanged().collect { id ->
                if (id != null) drivers.invalidate()
            }
        }

        // useDispatchSocket(driver.status === 'online', driver.phone)
        scope.launch {
            combine(session.loggedIn, session.me.map { it.data }) { loggedIn, me ->
                if (loggedIn && me?.isOnline == true && !me.phone.isNullOrBlank()) me.phone else null
            }.distinctUntilChanged().collect { phone ->
                socketJob?.cancel()
                socketJob = null
                if (phone != null) socketJob = scope.launch { socket.events(phone).collect(::onEvent) }
            }
        }

        // useAutoConnectOnNudge: open the panel and connect, only while idle; re-arm when false.
        scope.launch {
            var fired = false
            drivers.context.map { it.data?.hasPendingNudge == true }.distinctUntilChanged().collect { pending ->
                if (!pending) {
                    fired = false
                    return@collect
                }
                val phone = session.currentPhone()
                if (!fired && phone != null && voice.state.value.status == VoiceStatus.Idle) {
                    fired = true
                    chat.openPanel()
                    voice.connect(phone)
                }
            }
        }

        // usePushLocationOnNewTrip: a new id in active_trips → immediate push.
        scope.launch {
            var known: Set<String>? = null
            drivers.context.map { l -> l.data?.activeTrips?.map { it.tripId }?.toSet() }.distinctUntilChanged().collect { ids ->
                if (ids == null) {
                    known = null
                    return@collect
                }
                val prev = known
                if (prev != null && (ids - prev).isNotEmpty()) location.pushImmediate()
                known = ids
            }
        }

        // Sign-out resets in-memory voice/chat state.
        scope.launch {
            session.loggedIn.collect { loggedIn ->
                if (!loggedIn) {
                    offers.dismiss()
                    if (voice.state.value.status != VoiceStatus.Idle) voice.disconnect()
                    chat.closePanel()
                    chat.clear()
                }
            }
        }
    }

    private fun onEvent(e: DispatchEvent) {
        when (e) {
            DispatchEvent.Opened -> drivers.invalidate()
            is DispatchEvent.Message -> when (e.event) {
                "trip_offer" -> {
                    drivers.invalidate()
                    e.data?.get("trip_id")?.jsonPrimitive?.content?.let(offers::show)
                }
                "trip_confirmed" -> location.pushImmediate()
                "schedule_updated", "pending_nudge" -> drivers.invalidate()
                else -> Unit
            }
        }
    }
}
