package com.chinhtruongba.driverapp.designsystem.glass

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.chinhtruongba.driverapp.designsystem.theme.CzenColors
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import dev.chrisbanes.haze.HazeInput
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.blur.HazeBlurStyle
import dev.chrisbanes.haze.blur.HazeColorEffect
import dev.chrisbanes.haze.blur.hazeBlur
import dev.chrisbanes.haze.glass.GlassStyle
import dev.chrisbanes.haze.glass.hazeGlass

/**
 * The backdrop that glass chrome samples. Screens put `Modifier.hazeSource(state)` on the
 * content that scrolls or pans behind their chrome and provide the state here.
 */
val LocalHazeState = compositionLocalOf<HazeState?> { null }

enum class GlassKind {
    /** Frosted bar material: strong blur + tint. Tab bar, top bars, sheets, composer. */
    Frosted,

    /** Liquid-glass lens with refraction and specular rim: orb, floating map controls, pill. */
    Lens,
}

/** True when the platform can blur what is behind a node (RenderEffect, API 31+). */
val supportsBackdropBlur: Boolean get() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S

/**
 * Glass material modifier: soft shadow, backdrop blur of [state] (or a tinted
 * translucent surface below API 31 / without a source), the theme tint, an inner
 * specular sheen and a 1 dp top-left highlight border so it reads as glass.
 */
@Composable
fun Modifier.glass(
    shape: RoundedCornerShape,
    kind: GlassKind = GlassKind.Frosted,
    state: HazeState? = LocalHazeState.current,
    elevation: Dp = 18.dp,
    tint: Color? = null,
    border: Boolean = true,
): Modifier {
    val colors = CzenTheme.colors
    val glassTint = tint ?: colors.glassTint
    val canBlur = state != null && supportsBackdropBlur
    val blurStyle = remember(glassTint, colors.isDark) {
        HazeBlurStyle {
            blurRadius(if (colors.isDark) 28.dp else 24.dp)
            noiseFactor(0.08f)
            colorEffects(listOf(HazeColorEffect.tint(glassTint)))
            fallbackColorEffect(HazeColorEffect.tint(colors.glassFallback))
        }
    }
    val lensStyle = remember(glassTint, shape, colors.isDark) {
        GlassStyle {
            shape(shape)
            tint(glassTint)
            specularIntensity(if (colors.isDark) 0.55f else 0.8f)
        }
    }
    var m = this
    if (elevation > 0.dp) {
        m = m.shadow(
            elevation = elevation,
            shape = shape,
            ambientColor = colors.shadow.copy(alpha = if (colors.isDark) 0.5f else 0.18f),
            spotColor = colors.shadow.copy(alpha = if (colors.isDark) 0.6f else 0.22f),
            clip = false,
        )
    }
    m = m.clip(shape)
    m = when {
        state == null || !canBlur -> m.background(tint?.copy(alpha = maxOf(tint.alpha, 0.94f)) ?: colors.glassFallback)
        kind == GlassKind.Lens && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
            m.hazeGlass(HazeInput.Sources(state), style = lensStyle)
        else -> m.hazeBlur(HazeInput.Sources(state), style = blurStyle)
    }
    m = m.glassSheen(colors)
    if (border) m = m.border(1.dp, glassRimBrush(colors), shape)
    return m
}

private fun Modifier.glassSheen(colors: CzenColors): Modifier = drawWithContent {
    // Soft top light falling off by ~45 % of the height: the "wet" top edge of glass.
    drawRect(
        Brush.verticalGradient(
            0f to colors.glassHighlight.copy(alpha = if (colors.isDark) 0.10f else 0.35f),
            0.45f to Color.Transparent,
        ),
    )
    drawContent()
}

/** 1 dp rim: bright at the top-left, fading to a faint edge at the bottom-right. */
fun glassRimBrush(colors: CzenColors): Brush = Brush.linearGradient(
    0f to colors.glassHighlight,
    0.35f to colors.glassHighlight.copy(alpha = colors.glassHighlight.alpha * 0.25f),
    0.7f to colors.glassEdge,
    1f to colors.glassEdge,
    start = Offset.Zero,
    end = Offset.Infinite,
)

/** Convenience container with the [glass] material. */
@Composable
fun GlassSurface(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(24.dp),
    kind: GlassKind = GlassKind.Frosted,
    elevation: Dp = 18.dp,
    tint: Color? = null,
    contentAlignment: Alignment = Alignment.TopStart,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier.glass(shape = shape, kind = kind, elevation = elevation, tint = tint),
        contentAlignment = contentAlignment,
        content = content,
    )
}
