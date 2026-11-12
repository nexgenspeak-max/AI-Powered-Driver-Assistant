package com.chinhtruongba.driverapp.feature.voice.ui

import android.provider.Settings
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.requiredWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.designsystem.glass.GlassKind
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenMark
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.feature.voice.VoiceStatus
import kotlinx.coroutines.delay

const val ORB_SIZE_DP = 64
private val ORB = ORB_SIZE_DP.dp
private val BAR_WEIGHT = floatArrayOf(0.72f, 1f, 0.88f, 0.95f, 0.78f)

/** System "remove animations" (animator duration scale 0) = reduce motion. */
@Composable
fun rememberReduceMotion(): Boolean {
    val ctx = LocalContext.current
    return remember {
        runCatching { Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }.getOrDefault(false)
    }
}

/**
 * The centre Czen orb: 64 dp liquid-glass bezel around a violet core. Idle breathes; connecting
 * and connected spin two counter-rotating gradient layers (8 s / 12 s, B ×1.35 slower,
 * reversed) with a pulse ring and bloom, and scale with the agent's voice.
 */
@Composable
fun CzenOrb(
    onHome: Boolean,
    modifier: Modifier = Modifier,
    vm: AssistantViewModel = hiltViewModel(),
) {
    val voice by vm.voiceState.collectAsStateWithLifecycle()
    val panelOpen by vm.panelOpen.collectAsStateWithLifecycle()
    val lastBot by vm.lastBotReply.collectAsStateWithLifecycle()
    val actions = rememberVoiceActions(vm)
    val reduceMotion = rememberReduceMotion()
    val c = CzenTheme.colors

    val status = voice.status
    val live = status == VoiceStatus.Connecting || status == VoiceStatus.Connected
    val connectedMuted = status == VoiceStatus.Connected && voice.isMicMuted

    val label = when {
        connectedMuted -> stringResource(R.string.orb_connected_muted)
        status == VoiceStatus.Connected && !panelOpen -> stringResource(R.string.orb_connected_closed)
        status == VoiceStatus.Idle -> stringResource(R.string.orb_idle)
        status == VoiceStatus.Connecting -> stringResource(R.string.orb_connecting)
        status == VoiceStatus.Connected -> stringResource(R.string.orb_connected)
        else -> stringResource(R.string.orb_error)
    }

    val t = rememberInfiniteTransition(label = "orb")
    val spinMs = if (status == VoiceStatus.Connecting) 8_000 else 12_000
    val spinA by t.animateFloat(0f, 360f, infiniteRepeatable(tween(spinMs, easing = LinearEasing)), label = "spinA")
    val spinB by t.animateFloat(360f, 0f, infiniteRepeatable(tween((spinMs * 1.35f).toInt(), easing = LinearEasing)), label = "spinB")
    val breath by t.animateFloat(1f, 1.045f, infiniteRepeatable(tween(2_200, easing = FastOutSlowInEasing), RepeatMode.Reverse), label = "breath")
    val pulse by t.animateFloat(0f, 1f, infiniteRepeatable(tween(1_600, easing = LinearEasing)), label = "pulse")

    val level = if (status == VoiceStatus.Connected) voice.agentAudioLevel else 0f
    val speakBoost = if (status == VoiceStatus.Connected && voice.agentSpeaking) 0.03f else 0f
    val targetScale = when {
        reduceMotion -> 1f
        status == VoiceStatus.Connected -> 1f + (level * 0.14f).coerceAtMost(0.12f) + speakBoost
        status == VoiceStatus.Idle || status == VoiceStatus.Error -> breath
        else -> 1f
    }
    val scale by animateFloatAsState(targetScale, spring(dampingRatio = 0.6f, stiffness = 300f), label = "orbScale")
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val press by animateFloatAsState(if (pressed && status != VoiceStatus.Connecting) 0.94f else 1f, label = "press")

    // Last bot message pops above the orb for 4.5 s when not on Home.
    var toast by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(lastBot) {
        val msg = lastBot ?: return@LaunchedEffect
        if (onHome || panelOpen) return@LaunchedEffect
        toast = msg
        delay(4_500)
        toast = null
    }
    LaunchedEffect(panelOpen, onHome) { if (panelOpen || onHome) toast = null }

    Box(modifier.size(ORB), contentAlignment = Alignment.Center) {
        // Toast card above the orb (not hit-testable, drawn outside the slot).
        Box(
            Modifier
                .align(Alignment.BottomCenter)
                .wrapContentSize(unbounded = true, align = Alignment.BottomCenter)
                .offset(y = -(ORB + 14.dp)),
        ) {
            AnimatedVisibility(
                visible = toast != null,
                enter = fadeIn(tween(220)) + scaleIn(tween(260), initialScale = 0.9f, transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 1f)),
                exit = fadeOut(tween(200)) + scaleOut(tween(200), targetScale = 0.94f),
            ) {
                Text(
                    toast.orEmpty(),
                    style = CzenTheme.type.label,
                    color = c.textPrimary,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .requiredWidth(220.dp)
                        .glass(RoundedCornerShape(20.dp), kind = GlassKind.Frosted, elevation = 16.dp)
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                )
            }
        }

        // Bloom + pulse ring while live.
        if (live && !reduceMotion) {
            Box(
                Modifier
                    .requiredSize(ORB + 36.dp)
                    .alpha(if (status == VoiceStatus.Connected) 0.30f + level * 0.5f else 0.22f)
                    .background(Brush.radialGradient(listOf(Brand.Primary.copy(alpha = 0.75f), Color.Transparent)), CircleShape),
            )
            Box(
                Modifier
                    .requiredSize(ORB + 16.dp)
                    .scale(1f + pulse * 0.22f)
                    .alpha((1f - pulse) * 0.7f)
                    .border(2.dp, c.secondary, CircleShape),
            )
        }

        Box(
            Modifier
                .size(ORB)
                .graphicsLayer {
                    scaleX = scale * press
                    scaleY = scale * press
                }
                .shadow(14.dp, CircleShape, ambientColor = Brand.Deep, spotColor = Brand.Primary)
                .glass(RoundedCornerShape(50), kind = GlassKind.Lens, elevation = 0.dp, tint = Brand.Primary.copy(alpha = 0.28f))
                .clickable(interaction, null, role = Role.Button, onClick = actions::onOrbTap)
                .semantics { contentDescription = label }
                .alpha(if (status == VoiceStatus.Connecting) 0.92f else 1f),
            contentAlignment = Alignment.Center,
        ) {
            OrbCore(status, spinA, spinB, reduceMotion, Modifier.padding(4.dp).fillMaxSize())
            // Specular top highlight + hairline inner ring.
            Box(
                Modifier
                    .padding(4.dp)
                    .fillMaxSize()
                    .clip(CircleShape)
                    .background(Brush.verticalGradient(0f to Color.White.copy(alpha = 0.34f), 0.5f to Color.Transparent))
                    .border(1.dp, Color.White.copy(alpha = 0.22f), CircleShape),
            )
            when (status) {
                VoiceStatus.Connected -> WaveBars(level, voice.agentSpeaking, reduceMotion, Color.White)
                VoiceStatus.Connecting -> PulsingMark(reduceMotion)
                else -> CzenMark(size = 30.dp, color = Color.White)
            }
        }
        if (connectedMuted) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = (-2).dp, y = 2.dp)
                    .size(14.dp)
                    .border(2.dp, Color.White, CircleShape)
                    .padding(2.dp)
                    .clip(CircleShape)
                    .background(c.danger),
            )
        }
    }
}

@Composable
private fun OrbCore(status: VoiceStatus, spinA: Float, spinB: Float, reduceMotion: Boolean, modifier: Modifier) {
    val live = status == VoiceStatus.Connecting || status == VoiceStatus.Connected
    Box(modifier.clip(CircleShape)) {
        if (!live) {
            Box(Modifier.fillMaxSize().background(Brush.linearGradient(Brand.OrbIdle)))
        } else {
            Box(
                Modifier
                    .fillMaxSize()
                    .scale(1.45f)
                    .rotate(if (reduceMotion) 0f else spinA)
                    .background(Brush.sweepGradient(Brand.OrbLayerA + Brand.OrbLayerA.first())),
            )
            Box(
                Modifier
                    .fillMaxSize()
                    .scale(1.45f)
                    .rotate(if (reduceMotion) 0f else spinB)
                    .alpha(0.55f)
                    .background(Brush.linearGradient(Brand.OrbLayerB)),
            )
        }
    }
}

@Composable
private fun PulsingMark(reduceMotion: Boolean) {
    val t = rememberInfiniteTransition(label = "mark")
    val a by t.animateFloat(0.55f, 1f, infiniteRepeatable(tween(480), RepeatMode.Reverse), label = "a")
    CzenMark(size = 28.dp, color = Color.White, modifier = Modifier.alpha(if (reduceMotion) 1f else a))
}

/** 5 white bars scaled by the agent's level; a gentle idle sway while the agent listens. */
@Composable
fun WaveBars(
    level: Float,
    speaking: Boolean,
    reduceMotion: Boolean,
    color: Color,
    count: Int = 5,
    barWidth: Dp = 3.5.dp,
    gap: Dp = 3.5.dp,
    minH: Dp = 6.dp,
    maxH: Dp = 22.dp,
) {
    val liveNow = speaking || level > 0.02f
    val t = rememberInfiniteTransition(label = "wave")
    val idle by t.animateFloat(0f, 1f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "idle")
    val base = (level * 2.4f).coerceAtMost(1f)
    Row(horizontalArrangement = Arrangement.spacedBy(gap), verticalAlignment = Alignment.CenterVertically) {
        repeat(count) { i ->
            val w = BAR_WEIGHT[i % BAR_WEIGHT.size]
            val target = minH + (maxH - minH) * (base * w) + if (!liveNow && !reduceMotion) (4.dp * idle * w) else 0.dp
            val h by animateFloatAsState(target.value, tween(90), label = "bar$i")
            Canvas(Modifier.size(barWidth, h.dp)) {
                drawRoundRect(color.copy(alpha = 0.95f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(size.width / 2, size.width / 2))
            }
        }
    }
}
