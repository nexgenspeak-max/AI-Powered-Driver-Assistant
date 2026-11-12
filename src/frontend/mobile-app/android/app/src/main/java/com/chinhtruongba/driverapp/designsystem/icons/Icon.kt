package com.chinhtruongba.driverapp.designsystem.icons

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

private const val STROKE = 1.75f
private const val STROKE_ACTIVE = 2f
private const val BODY_TINT = 0.22f

private val pathCache = HashMap<String, Path>()

private fun pathFor(d: String, evenOdd: Boolean): Path {
    val key = if (evenOdd) "eo:$d" else d
    return pathCache.getOrPut(key) {
        PathParser().parsePathString(d).toPath().apply {
            fillType = if (evenOdd) PathFillType.EvenOdd else PathFillType.NonZero
        }
    }
}

/**
 * Czen's own 24-grid icon set (ported from glyphs.ts / Icon.tsx): round caps and joins,
 * 1.75 stroke (2 when [active]), duotone body tint in the active state.
 */
@Composable
fun Icon(
    icon: CzenIcon,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp,
    color: Color = Color.Black,
    active: Boolean = false,
    strokeWidth: Float? = null,
    contentDescription: String? = null,
) {
    val optical = when {
        size <= 16.dp -> 0.35f
        size <= 20.dp -> 0.15f
        else -> 0f
    }
    val sw = strokeWidth ?: ((if (active) STROKE_ACTIVE else STROKE) + optical)
    val semantics = if (contentDescription != null) {
        Modifier.semantics { this.contentDescription = contentDescription }
    } else {
        Modifier
    }
    Canvas(modifier.size(size).then(semantics)) {
        val k = this.size.minDimension / 24f
        scale(k, pivot = Offset.Zero) {
            val stroke = Stroke(width = sw, cap = StrokeCap.Round, join = StrokeJoin.Round)
            for (part in icon.parts) {
                when (part) {
                    is PathPart -> {
                        val p = pathFor(part.d, part.evenOdd)
                        if (part.solid) {
                            drawPath(p, color, style = Fill)
                        } else {
                            if (active && part.body) drawPath(p, color.copy(alpha = color.alpha * BODY_TINT), style = Fill)
                            drawPath(p, color, style = stroke)
                        }
                    }
                    is CirclePart -> {
                        val c = Offset(part.cx, part.cy)
                        if (part.dot) {
                            drawCircle(color, part.r, c, style = Fill)
                        } else {
                            if (active && part.body) drawCircle(color.copy(alpha = color.alpha * BODY_TINT), part.r, c, style = Fill)
                            drawCircle(color, part.r, c, style = stroke)
                        }
                    }
                }
            }
        }
    }
}

private val czenArc by lazy { PathParser().parsePathString("M741.8 704.8 A300 300 0 1 1 741.8 319.2").toPath() }

/**
 * The Czen brand mark: an open "C" ring with three voice bars (1024 viewBox).
 * [barScales] lets the orb animate the bars with the agent's audio level.
 */
@Composable
fun CzenMark(
    modifier: Modifier = Modifier,
    size: Dp = 28.dp,
    color: Color = Color.White,
    barScales: FloatArray? = null,
) {
    Canvas(modifier.size(size)) {
        val k = this.size.minDimension / 1024f
        scale(k, pivot = Offset.Zero) {
            drawPath(czenArc, color, style = Stroke(width = 96f, cap = StrokeCap.Round))
            val bars = arrayOf(floatArrayOf(539f, 437f, 150f), floatArrayOf(624f, 382f, 260f), floatArrayOf(709f, 417f, 190f))
            bars.forEachIndexed { i, (x, y, h) ->
                val s = barScales?.getOrNull(i) ?: 1f
                val hh = (h * s).coerceAtLeast(62f)
                val cy = y + h / 2f
                drawRoundRect(color, Offset(x, cy - hh / 2f), Size(62f, hh), CornerRadius(31f, 31f))
            }
        }
    }
}
