package com.chinhtruongba.driverapp.feature.home

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.charset.CharacterCodingException
import java.nio.charset.CodingErrorAction
import java.util.Locale
import java.util.zip.GZIPInputStream

/**
 * Goong's `composite` vector tiles carry some POI names (layer `point_map`, property `name`)
 * that were double-encoded upstream: the UTF-8 bytes were read as Windows-1252 and the result
 * title-cased, e.g. "Công Ty Cổ Phần" arrives as "Cã´ng Ty Cá»• Pháº§n". MapLibre renders the
 * string it is given, so the fix is to undo that encoding before the tile reaches the renderer.
 *
 * Port of the iOS `MojibakeRepair` (Features/Home/TileTextRepair.swift); same algorithm, same cases.
 */
object MojibakeRepair {
    /** Windows-1252 0x80–0x9F code points that are not Latin-1 controls. */
    private val cp1252: Map<Int, Int> = mapOf(
        0x20AC to 0x80, 0x201A to 0x82, 0x0192 to 0x83, 0x201E to 0x84, 0x2026 to 0x85, 0x2020 to 0x86, 0x2021 to 0x87,
        0x02C6 to 0x88, 0x2030 to 0x89, 0x0160 to 0x8A, 0x2039 to 0x8B, 0x0152 to 0x8C, 0x017D to 0x8E, 0x2018 to 0x91,
        0x2019 to 0x92, 0x201C to 0x93, 0x201D to 0x94, 0x2022 to 0x95, 0x2013 to 0x96, 0x2014 to 0x97, 0x02DC to 0x98,
        0x2122 to 0x99, 0x0161 to 0x9A, 0x203A to 0x9B, 0x0153 to 0x9C, 0x017E to 0x9E, 0x0178 to 0x9F,
    )

    private val vi = Locale.forLanguageTag("vi-VN")

    private fun isContinuation(b: Int) = b and 0xC0 == 0x80

    /**
     * The repaired text, or null when [text] is not this kind of mojibake (left untouched).
     * Correct text never qualifies: real Vietnamese contains letters outside Windows-1252
     * (ộ, ư…), and Latin-1-only text such as "Bãi" or "Café" is not a valid byte sequence.
     */
    fun repair(text: String): String? {
        val bytes = ArrayList<Int>(text.length)
        var sawHigh = false
        var i = 0
        while (i < text.length) {
            val v = text.codePointAt(i)
            i += Character.charCount(v)
            if (v < 0x100) {
                bytes += v
                if (v >= 0x80) sawHigh = true
            } else {
                val b = cp1252[v] ?: return null
                bytes += b
                sawHigh = true
            }
        }
        if (!sawHigh) return null
        val decoded = decodeLenient(bytes) ?: return null
        if (decoded == text) return null
        if (decoded.none { it.code >= 0x80 }) return null
        if (decoded.any { it.code in 0x80..0x9F || (it.code < 0x20 && it != '\n') }) return null
        // The upstream pass title-cased the mojibake (which also changed case inside letters);
        // title-casing the decoded name restores a consistent "Công Ty Cổ Phần".
        return capitalized(decoded)
    }

    /** Foundation's `capitalized(with:)`: first letter of each word upper, the rest lower. */
    private fun capitalized(s: String): String {
        val out = StringBuilder(s.length)
        var startOfWord = true
        var i = 0
        while (i < s.length) {
            val cp = s.codePointAt(i)
            val ch = String(Character.toChars(cp))
            i += Character.charCount(cp)
            if (Character.isLetterOrDigit(cp)) {
                out.append(if (startOfWord) ch.uppercase(vi) else ch.lowercase(vi))
                startOfWord = false
            } else {
                out.append(ch)
                startOfWord = Character.isWhitespace(cp) || Character.isSpaceChar(cp) || cp == '-'.code || cp == '('.code || cp == '/'.code
            }
        }
        return out.toString()
    }

    /**
     * UTF-8 decode that also accepts lead bytes whose case the title-casing flipped:
     * a lowercased 2-byte lead (Ã→ã: C3→E3) and an uppercased 3-byte lead (á→Á: E1→C1).
     * Both shapes are never valid UTF-8, so reading them this way cannot change correct text.
     */
    private fun decodeLenient(b: List<Int>): String? {
        val out = ByteArrayOutputStream(b.size)
        val n = b.size
        fun conts(from: Int, count: Int): Boolean {
            if (from + count > n) return false
            return (from until from + count).all { isContinuation(b[it]) }
        }
        var i = 0
        while (i < n) {
            val c = b[i]
            if (c < 0x80) {
                out.write(c); i += 1; continue
            }
            val need = when (c) {
                in 0xC2..0xDF -> 1
                in 0xE0..0xEF -> 2
                in 0xF0..0xF4 -> 3
                else -> 0
            }
            // Uppercased 3-byte lead: 2-byte lead + two continuation bytes.
            if (c in 0xC0..0xCF && conts(i + 1, 2)) {
                out.write(c + 0x20); out.write(b[i + 1]); out.write(b[i + 2])
                i += 3
                continue
            }
            if (need > 0 && conts(i + 1, need)) {
                for (k in i..i + need) out.write(b[k])
                i += need + 1
                continue
            }
            // Lowercased 2-byte lead: one continuation byte, then not another.
            if (c in 0xE2..0xFE && conts(i + 1, 1) && !(i + 2 < n && isContinuation(b[i + 2]))) {
                out.write(c - 0x20); out.write(b[i + 1])
                i += 2
                continue
            }
            return null
        }
        return strictUtf8(out.toByteArray(), 0, out.size())
    }

    /** Strict UTF-8 decode (null on malformed input), like Swift's `String(bytes:encoding:.utf8)`. */
    internal fun strictUtf8(b: ByteArray, from: Int, to: Int): String? = try {
        Charsets.UTF_8.newDecoder()
            .onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT)
            .decode(ByteBuffer.wrap(b, from, to - from))
            .toString()
    } catch (_: CharacterCodingException) {
        null
    }
}

/** Rewrites the string values of a Mapbox Vector Tile (protobuf) through [MojibakeRepair]. */
object VectorTileRepair {
    private fun isGzip(b: ByteArray) = b.size > 1 && b[0] == 0x1F.toByte() && b[1] == 0x8B.toByte()

    /**
     * The repaired tile (always uncompressed), or null when nothing needed repair or the data is
     * not an MVT. Gzip-compressed tiles are inflated first.
     */
    fun repairMaybeGzipped(data: ByteArray): ByteArray? {
        val plain = if (isGzip(data)) gunzip(data) ?: return null else data
        return repair(plain)
    }

    private fun gunzip(data: ByteArray): ByteArray? = runCatching {
        GZIPInputStream(ByteArrayInputStream(data)).use { it.readBytes() }
    }.getOrNull()

    /** The repaired tile, or null when nothing needed repair (or the data is not a plain MVT). */
    fun repair(data: ByteArray): ByteArray? {
        if (data.isEmpty() || isGzip(data)) return null // gzip: not a plain MVT
        var changed = false
        val out = ByteArrayOutputStream(data.size)
        val ok = forEachField(data, 0, data.size) { field, wire, rawFrom, rawTo, payload ->
            val layer = if (field == 3 && wire == 2 && payload != null) repairLayer(data, payload.first, payload.last + 1) else null
            if (layer != null) {
                changed = true
                appendLengthDelimited(3, layer, out)
            } else {
                out.write(data, rawFrom, rawTo - rawFrom)
            }
        }
        return if (ok && changed) out.toByteArray() else null
    }

    /** Layer: values are field 4; a Value's string is its field 1. */
    private fun repairLayer(b: ByteArray, from: Int, to: Int): ByteArray? {
        var changed = false
        val out = ByteArrayOutputStream(to - from)
        val ok = forEachField(b, from, to) { field, wire, rawFrom, rawTo, payload ->
            val value = if (field == 4 && wire == 2 && payload != null) repairValue(b, payload.first, payload.last + 1) else null
            if (value != null) {
                changed = true
                appendLengthDelimited(4, value, out)
            } else {
                out.write(b, rawFrom, rawTo - rawFrom)
            }
        }
        return if (ok && changed) out.toByteArray() else null
    }

    private fun repairValue(b: ByteArray, from: Int, to: Int): ByteArray? {
        var fixed: ByteArray? = null
        val ok = forEachField(b, from, to) { field, wire, _, _, payload ->
            if (field != 1 || wire != 2 || payload == null) return@forEachField
            val text = MojibakeRepair.strictUtf8(b, payload.first, payload.last + 1) ?: return@forEachField
            val repaired = MojibakeRepair.repair(text) ?: return@forEachField
            val out = ByteArrayOutputStream()
            appendLengthDelimited(1, repaired.toByteArray(Charsets.UTF_8), out)
            fixed = out.toByteArray()
        }
        return if (ok) fixed else null
    }

    // ---- Protobuf wire format ----

    /**
     * Calls `body(field, wireType, rawFrom, rawTo, lengthDelimitedPayload?)` per field of
     * `b[from, to)`. An empty payload is passed as an empty range. Returns false on malformed input.
     */
    private inline fun forEachField(
        b: ByteArray,
        from: Int,
        to: Int,
        body: (field: Int, wire: Int, rawFrom: Int, rawTo: Int, payload: IntRange?) -> Unit,
    ): Boolean {
        var i = from
        val pos = IntArray(1)
        while (i < to) {
            val start = i
            pos[0] = i
            val key = readVarint(b, pos, to) ?: return false
            i = pos[0]
            val field = (key ushr 3).toInt()
            val wire = (key and 7).toInt()
            var payload: IntRange? = null
            when (wire) {
                0 -> {
                    pos[0] = i
                    readVarint(b, pos, to) ?: return false
                    i = pos[0]
                }
                1 -> i += 8
                2 -> {
                    pos[0] = i
                    val len = readVarint(b, pos, to) ?: return false
                    i = pos[0]
                    if (len < 0 || len > (to - i).toLong()) return false
                    payload = i until i + len.toInt()
                    i += len.toInt()
                }
                5 -> i += 4
                else -> return false
            }
            if (i > to) return false
            body(field, wire, start, i, payload)
        }
        return true
    }

    private fun readVarint(b: ByteArray, pos: IntArray, to: Int): Long? {
        var result = 0L
        var shift = 0
        var i = pos[0]
        while (i < to && shift < 64) {
            val c = b[i].toInt() and 0xFF
            i++
            result = result or ((c and 0x7F).toLong() shl shift)
            if (c < 0x80) {
                pos[0] = i
                return result
            }
            shift += 7
        }
        return null
    }

    private fun appendVarint(value: Long, out: ByteArrayOutputStream) {
        var v = value
        while (v >= 0x80 || v < 0) {
            out.write(((v and 0x7F) or 0x80).toInt())
            v = v ushr 7
        }
        out.write(v.toInt())
    }

    private fun appendLengthDelimited(field: Int, payload: ByteArray, out: ByteArrayOutputStream) {
        appendVarint((field.toLong() shl 3) or 2, out)
        appendVarint(payload.size.toLong(), out)
        out.write(payload)
    }
}
