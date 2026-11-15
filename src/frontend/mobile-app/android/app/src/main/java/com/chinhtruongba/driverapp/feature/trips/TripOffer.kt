package com.chinhtruongba.driverapp.feature.trips

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.app.TripOfferStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.TripStatus
import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.core.util.Haptics
import com.chinhtruongba.driverapp.designsystem.components.ButtonVariant
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.RouteLine
import com.chinhtruongba.driverapp.designsystem.glass.GlassKind
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.motion.rememberReduceMotion
import com.chinhtruongba.driverapp.designsystem.motion.unless
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import com.chinhtruongba.driverapp.feature.voice.FillerAudio
import com.chinhtruongba.driverapp.feature.voice.VoiceSession
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

const val OFFER_SECONDS = 30

data class OfferUiState(
    val tripId: String? = null,
    val trip: Trip? = null,
    val secondsLeft: Int = OFFER_SECONDS,
    val accepting: Boolean = false,
    val rejecting: Boolean = false,
)

/**
 * The life of one ringing offer (TripOfferSheet effects): the 30 s countdown, the fetch of the
 * offered trip and the "still offered to this driver" check. Everything runs inside the block of
 * the current trip id, so a newer offer (or a dismiss) cancels the older offer's timer and fetch.
 */
internal class OfferSession(
    private val store: TripOfferStore,
    private val fetchTrip: suspend (String) -> Trip,
    private val phone: () -> String?,
    private val onNewOffer: () -> Unit = {},
    private val now: () -> Long = System::currentTimeMillis,
) {
    private val _ui = MutableStateFlow(OfferUiState())
    val ui: StateFlow<OfferUiState> = _ui.asStateFlow()

    fun update(transform: (OfferUiState) -> OfferUiState) = _ui.update(transform)

    /** Runs until cancelled; call once from the owner's scope. */
    suspend fun run() {
        store.tripId.collectLatest { id ->
            if (id == null) {
                _ui.value = OfferUiState()
                return@collectLatest
            }
            _ui.value = OfferUiState(tripId = id)
            onNewOffer()
            coroutineScope {
                launch { countdown(id) }
                // Socket (re)open and schedule_updated: the offer may have been answered elsewhere.
                launch { store.revalidations.collect { check(id, initial = false) } }
                check(id, initial = true)
            }
        }
    }

    private suspend fun countdown(id: String) {
        val started = now()
        while (true) {
            val left = OFFER_SECONDS - ((now() - started) / 1000).toInt()
            if (left <= 0) {
                store.dismiss(id)
                return
            }
            _ui.update { it.copy(secondsLeft = left) }
            delay(250)
        }
    }

    private suspend fun check(id: String, initial: Boolean) {
        try {
            val trip = fetchTrip(id)
            val me = phone()
            val stillOffered = (trip.status == TripStatus.Notified || trip.status == TripStatus.Calling) &&
                (me == null || trip.driverPhone == me)
            if (!stillOffered) {
                store.dismiss(id)
                return
            }
            _ui.update { if (it.tripId == id) it.copy(trip = trip) else it }
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            // A failed first load has nothing to show; a failed re-check keeps the sheet as it is.
            if (initial) store.dismiss(id)
        }
    }
}

@HiltViewModel
class TripOfferViewModel @Inject constructor(
    private val store: TripOfferStore,
    private val drivers: DriverRepository,
    private val session: SessionRepository,
    private val tracker: LocationTracker,
    private val voice: VoiceSession,
    private val filler: FillerAudio,
    private val haptics: Haptics,
) : ViewModel() {
    private val offer = OfferSession(
        store = store,
        fetchTrip = drivers::trip,
        phone = session::currentPhone,
        onNewOffer = {
            haptics.success()
            // The alert is skipped while the voice session is connecting/connected.
            val vs = voice.state.value.status
            if (vs != VoiceStatus.Connecting && vs != VoiceStatus.Connected) filler.playNewTripAlert()
        },
    )
    val ui: StateFlow<OfferUiState> = offer.ui

    init {
        viewModelScope.launch { offer.run() }
    }

    fun dismiss() = store.dismiss()

    fun accept() {
        val id = ui.value.tripId ?: return
        if (ui.value.accepting) return
        offer.update { it.copy(accepting = true) }
        viewModelScope.launch {
            try {
                tracker.pushImmediate()
                drivers.acceptTrip(id)
                haptics.success()
                store.dismiss(id)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                haptics.error()
                offer.update { it.copy(accepting = false) }
            }
        }
    }

    fun reject() {
        val id = ui.value.tripId ?: return
        if (ui.value.rejecting) return
        offer.update { it.copy(rejecting = true) }
        viewModelScope.launch {
            try {
                drivers.rejectTrip(id)
                store.dismiss(id)
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                offer.update { it.copy(rejecting = false) }
            }
        }
    }
}

/** TripOfferSheet: backdrop rgba(10,6,20,.55), glass sheet with top radius 28, 30 s ring. */
@Composable
fun TripOfferHost(vm: TripOfferViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val visible = s.tripId != null && s.trip != null
    val laterDesc = stringResource(R.string.offer_later)
    val reduceMotion = rememberReduceMotion()
    Box(Modifier.fillMaxSize()) {
        AnimatedVisibility(visible, enter = fadeIn(tween(180)).unless(reduceMotion), exit = fadeOut(tween(150)).unless(reduceMotion)) {
            Box(
                Modifier
                    .fillMaxSize()
                    .background(Color(0x8C0A0614))
                    .clickable(remember { MutableInteractionSource() }, null, role = Role.Button, onClick = vm::dismiss)
                    .semantics { contentDescription = laterDesc },
            )
        }
        AnimatedVisibility(
            visible,
            modifier = Modifier.align(Alignment.BottomCenter),
            enter = slideInVertically(spring(dampingRatio = 0.78f, stiffness = Spring.StiffnessMediumLow)) { it }.unless(reduceMotion),
            exit = slideOutVertically(tween(200)) { it }.unless(reduceMotion),
        ) {
            s.trip?.let { OfferSheet(it, s, vm) }
        }
    }
}

@Composable
private fun OfferSheet(trip: Trip, s: OfferUiState, vm: TripOfferViewModel) {
    val c = CzenTheme.colors
    val progress by animateFloatAsState(s.secondsLeft / OFFER_SECONDS.toFloat(), tween(250), label = "ring")
    Column(
        Modifier
            .widthIn(max = 640.dp)
            .fillMaxWidth()
            .glass(
                RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                kind = GlassKind.Frosted,
                elevation = 24.dp,
                tint = c.surfaceElevated.copy(alpha = if (c.isDark) 0.78f else 0.82f),
            )
            .pointerInput(Unit) { detectTapGestures { } }
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(start = 20.dp, end = 20.dp, top = 10.dp, bottom = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Box(Modifier.align(Alignment.CenterHorizontally).width(40.dp).height(4.dp).clip(RoundedCornerShape(2.dp)).background(c.borderStrong))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(stringResource(R.string.offer_title), style = CzenTheme.type.h2, color = c.textPrimary, modifier = Modifier.weight(1f))
            Text(stringResource(R.string.offer_countdown, s.secondsLeft), style = CzenTheme.type.label, color = c.textSecondary)
            Box(
                Modifier
                    .padding(start = 12.dp)
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(c.chip)
                    .clickable(role = Role.Button, onClick = vm::dismiss),
                contentAlignment = Alignment.Center,
            ) { Icon(CzenIcon.Close, size = 18.dp, color = c.textPrimary, contentDescription = stringResource(R.string.offer_later)) }
        }
        Box(Modifier.align(Alignment.CenterHorizontally).size(132.dp), contentAlignment = Alignment.Center) {
            val primary = c.primary
            val track = c.ringTrack
            Canvas(Modifier.fillMaxSize()) {
                val sw = 8.dp.toPx()
                val inset = sw / 2
                val arcSize = androidx.compose.ui.geometry.Size(size.width - sw, size.height - sw)
                val tl = androidx.compose.ui.geometry.Offset(inset, inset)
                drawArc(track, 0f, 360f, false, tl, arcSize, style = Stroke(sw))
                drawArc(primary, -90f, 360f * progress, false, tl, arcSize, style = Stroke(sw, cap = StrokeCap.Round))
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(stringResource(R.string.offer_fare), style = CzenTheme.type.caption, color = c.textSecondary)
                Text(trip.estimatedFare?.let { Format.currency(it) } ?: "—", style = CzenTheme.type.h2, color = c.textPrimary)
            }
        }
        TripMetaRow(trip.distanceKm, trip.etaMinutes, trip.pickupTime, trip.trafficNote, Modifier.align(Alignment.CenterHorizontally))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(CzenIcon.Customer, size = 20.dp, color = c.textSecondary)
            Text(trip.customerName.ifBlank { stringResource(R.string.customer_fallback) }, style = CzenTheme.type.bodyStrong, color = c.textPrimary, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
            Text(trip.customerPhone, style = CzenTheme.type.label, color = c.textSecondary)
        }
        RouteLine(trip.pickupAddress, trip.dropoffAddress)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            CzenButton(stringResource(R.string.trip_reject), vm::reject, Modifier.weight(1f), variant = ButtonVariant.Outline, loading = s.rejecting, enabled = !s.accepting)
            CzenButton(stringResource(R.string.trip_accept), vm::accept, Modifier.weight(2f), loading = s.accepting, enabled = !s.rejecting)
        }
    }
}
