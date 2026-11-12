package com.chinhtruongba.driverapp.core.util

import java.text.Normalizer
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

/** vi-VN formatting helpers, byte-for-byte with driver-app/src/utils/format.ts. */
object Format {
    private val viVN: Locale = Locale.forLanguageTag("vi-VN")

    private fun groupDots(n: Long): String {
        val s = abs(n).toString()
        val sb = StringBuilder()
        s.forEachIndexed { i, ch ->
            if (i > 0 && (s.length - i) % 3 == 0) sb.append('.')
            sb.append(ch)
        }
        return (if (n < 0) "-" else "") + sb
    }

    /** `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})` → "120.000 ₫". */
    fun currency(amount: Double, currency: String = "VND"): String {
        val symbol = if (currency.equals("VND", true)) "₫" else currency
        return groupDots(amount.roundToLong()) + " " + symbol
    }

    /** "4,5 km" under 10 km, "12 km" / "1.674 km" above — Vietnamese decimal comma. */
    fun km(km: Double?): String {
        if (km == null || km.isNaN() || km.isInfinite()) return ""
        if (km >= 10) return "${groupDots(km.roundToLong())} km"
        val oneDecimal = (Math.round(km * 10.0) / 10.0)
        return String.format(Locale.US, "%.1f", oneDecimal).replace('.', ',') + " km"
    }

    /** "12 phút", "1 giờ", "1 giờ 05 phút". */
    fun minutes(min: Double?): String {
        if (min == null || min.isNaN() || min.isInfinite()) return ""
        val m = maxOf(0L, Math.round(min))
        if (m < 60) return "$m phút"
        val h = m / 60
        val rest = m % 60
        return if (rest == 0L) "$h giờ" else "$h giờ ${rest.toString().padStart(2, '0')} phút"
    }

    /** "12 phút · 4,5 km" — one line for a trip leg; "—" without an ETA. */
    fun route(eta: Double?, km: Double?): String {
        if (eta == null || eta == 0.0) return "—"
        return listOf(minutes(eta), km(km)).filter { it.isNotEmpty() }.joinToString(" · ")
    }

    /** Hours with a Vietnamese decimal comma: 3.5 → "3,5". */
    fun hours(h: Double): String = String.format(Locale.US, "%.1f", h).replace('.', ',')

    fun parseInstant(iso: String?): ZonedDateTime? {
        if (iso.isNullOrBlank()) return null
        return try {
            OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault())
        } catch (_: DateTimeParseException) {
            try {
                java.time.Instant.parse(iso).atZone(ZoneId.systemDefault())
            } catch (_: DateTimeParseException) {
                try {
                    java.time.LocalDateTime.parse(iso).atZone(ZoneId.systemDefault())
                } catch (_: DateTimeParseException) {
                    null
                }
            }
        }
    }

    /** "14:30" — time only; bare legacy values like "14:30" are shown as-is. */
    fun time(iso: String?): String {
        if (iso.isNullOrBlank()) return "—"
        val d = parseInstant(iso) ?: return iso
        return d.format(DateTimeFormatter.ofPattern("HH:mm", viVN))
    }

    /** vi-VN short date + time: "14:30 12/11/2026". */
    fun dateTime(iso: String?): String {
        if (iso.isNullOrBlank()) return "—"
        val d = parseInstant(iso) ?: return iso
        return d.format(DateTimeFormatter.ofPattern("HH:mm d/M/yyyy", viVN))
    }

    /** vi-VN weekday date used for older history groups: "Thứ Hai, 10/11". */
    fun weekdayDate(date: LocalDate): String {
        val names = listOf("Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật")
        return "${names[date.dayOfWeek.value - 1]}, ${date.dayOfMonth}/${date.monthValue}"
    }

    /** Metres as a compact radius label: 500 → "500 m", 1000 → "1 km". */
    fun radius(m: Int): String = if (m >= 1000) {
        val km = m / 1000.0
        (if (km % 1.0 == 0.0) km.toLong().toString() else String.format(Locale.US, "%.1f", km).replace('.', ',')) + " km"
    } else {
        "$m m"
    }
}

/** Accent-insensitive Vietnamese search (driver-app/src/utils/search.ts). */
object Search {
    private val marks = Regex("[\\u0300-\\u036f]")
    private val spaces = Regex("\\s+")

    fun fold(text: String?): String {
        if (text == null) return ""
        return Normalizer.normalize(text, Normalizer.Form.NFD)
            .replace(marks, "")
            .replace('đ', 'd')
            .replace('Đ', 'D')
            .lowercase(Locale.ROOT)
            .replace(spaces, " ")
            .trim()
    }

    /** True when every word of [query] appears in any of [fields] (folded). */
    fun matches(query: String, fields: List<String?>): Boolean {
        val q = fold(query)
        if (q.isEmpty()) return true
        val hay = fold(fields.filterNot { it.isNullOrEmpty() }.joinToString(" "))
        return q.split(' ').all { hay.contains(it) }
    }
}
