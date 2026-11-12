package com.chinhtruongba.driverapp.feature.home

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.vector.PathParser
import androidx.core.content.ContextCompat
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.createBitmap
import androidx.core.graphics.withTranslation
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.designsystem.icons.CirclePart
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.PathPart
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import androidx.compose.ui.graphics.toArgb

/** Crisp, density-aware bitmaps for MapLibre SymbolLayer icons (driver + stop pills). */
internal class MarkerBitmaps(private val context: Context) {
    private val density = context.resources.displayMetrics.density
    private fun dp(v: Float) = v * density

    private val semiBold = runCatching { ResourcesCompat.getFont(context, R.font.inter_600) }.getOrNull()
    private val bold = runCatching { ResourcesCompat.getFont(context, R.font.inter_700) }.getOrNull()

    /** Driver: 44 dp white circle, #8B5CF6 ring and the van artwork, with a soft drop shadow. */
    fun driver(): Bitmap {
        val size = dp(52f)
        val bmp = createBitmap(size.toInt(), size.toInt())
        val c = Canvas(bmp)
        val cx = size / 2
        val r = dp(22f)
        val shadow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            setShadowLayer(dp(4f), 0f, dp(1.5f), 0x55000000)
        }
        c.drawCircle(cx, cx, r, shadow)
        val ring = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = dp(2.5f)
            color = Brand.Primary.toArgb()
        }
        c.drawCircle(cx, cx, r - dp(1.25f), ring)
        ContextCompat.getDrawable(context, R.drawable.driver_van)?.let { d ->
            val w = dp(32f)
            val h = w * d.intrinsicHeight / d.intrinsicWidth.coerceAtLeast(1)
            d.setBounds((cx - w / 2).toInt(), (cx - h / 2).toInt(), (cx + w / 2).toInt(), (cx + h / 2).toInt())
            d.draw(c)
        }
        return bmp
    }

    /**
     * Stop pill in the trip colour: order badge, pin (pickup) / flag (dropoff) glyph and the
     * customer name, with a pointer at the bottom (anchor = bottom).
     */
    fun stop(stop: MapStop): Bitmap {
        val name = stop.name.ifBlank { context.getString(R.string.customer_fallback) }.let { if (it.length > 18) it.take(17) + "…" else it }
        val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = android.graphics.Color.WHITE
            textSize = dp(12.5f)
            typeface = semiBold
        }
        val badgeText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = stop.color
            textSize = dp(11f)
            typeface = bold
            textAlign = Paint.Align.CENTER
        }
        val h = dp(30f)
        val pad = dp(5f)
        val badge = if (stop.order != null) dp(20f) else 0f
        val icon = dp(16f)
        val gap = dp(5f)
        val textW = text.measureText(name)
        val w = pad + (if (badge > 0) badge + gap else 0f) + icon + gap + textW + dp(10f)
        val pointer = dp(7f)
        val shadowPad = dp(4f)
        val bmp = createBitmap((w + shadowPad * 2).toInt(), (h + pointer + shadowPad * 2).toInt())
        val c = Canvas(bmp)
        c.withTranslation(shadowPad, shadowPad) {
            val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = stop.color
                setShadowLayer(dp(3f), 0f, dp(1.5f), 0x55000000)
            }
            val rect = RectF(0f, 0f, w, h)
            val shape = Path().apply {
                addRoundRect(rect, h / 2, h / 2, Path.Direction.CW)
                moveTo(w / 2 - pointer, h - 1)
                lineTo(w / 2, h + pointer)
                lineTo(w / 2 + pointer, h - 1)
                close()
            }
            drawPath(shape, fill)
            val border = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = dp(1.5f)
                color = 0xE6FFFFFF.toInt()
            }
            drawRoundRect(rect, h / 2, h / 2, border)
            var x = pad
            if (stop.order != null) {
                val white = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.WHITE }
                drawCircle(x + badge / 2, h / 2, badge / 2, white)
                val fm = badgeText.fontMetrics
                drawText(stop.order.toString(), x + badge / 2, h / 2 - (fm.ascent + fm.descent) / 2, badgeText)
                x += badge + gap
            }
            drawGlyph(this, if (stop.isPickup) CzenIcon.Pin else CzenIcon.Flag, x, (h - icon) / 2, icon)
            x += icon + gap
            val fm = text.fontMetrics
            drawText(name, x, h / 2 - (fm.ascent + fm.descent) / 2, text)
        }
        return bmp
    }

    private fun drawGlyph(c: Canvas, icon: CzenIcon, x: Float, y: Float, size: Float) {
        val k = size / 24f
        val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 2f
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            color = android.graphics.Color.WHITE
        }
        val solid = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.WHITE }
        c.withTranslation(x, y) {
            scale(k, k)
            for (p in icon.parts) {
                when (p) {
                    is PathPart -> {
                        val path = PathParser().parsePathString(p.d).toPath().asAndroidPath()
                        drawPath(path, if (p.solid) solid else stroke)
                    }
                    is CirclePart -> drawCircle(p.cx, p.cy, p.r, if (p.dot) solid else stroke)
                }
            }
        }
    }
}
