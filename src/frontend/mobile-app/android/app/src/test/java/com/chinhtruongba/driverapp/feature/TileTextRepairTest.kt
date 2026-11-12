package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.feature.home.GoongTileRepairInterceptor
import com.chinhtruongba.driverapp.feature.home.GoongTileRepairer
import com.chinhtruongba.driverapp.feature.home.MojibakeRepair
import com.chinhtruongba.driverapp.feature.home.VectorTileRepair
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import okio.Buffer
import okio.ByteString.Companion.toByteString
import java.io.ByteArrayOutputStream
import java.util.zip.GZIPOutputStream
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** Same cases as the iOS `MapLabelRepairTests` (CzenDriverTests/ReviewFixTests.swift). */
class TileTextRepairTest {
    @Test
    fun `double-encoded Goong POI names are restored`() {
        val cases = listOf(
            "Cã´ng Ty Cá»• Pháº§n Hã³a Dæ°á»£c Vã  Cã´ng Nghá»‡ Sinh Há»\u008dc Biogreen" to
                "Công Ty Cổ Phần Hóa Dược Và Công Nghệ Sinh Học Biogreen",
            "Bãºn Cháº£" to "Bún Chả",
            "Cã´ng Ty Phã¡t Triá»ƒn Thá»§y Sáº£n Nam Ä\u0090áº¡i Dæ°æ¡ng" to "Công Ty Phát Triển Thủy Sản Nam Đại Dương",
            "Floriel - Tiá»†m Hoa Tæ¯æ I" to "Floriel - Tiệm Hoa Tươi",
            "Cã´ng Ty Tnhh Sáº£n Xuáº¥t Cæ¡ Khã­ Vã  Thæ°æ¡ng Máº¡i Dá»‹ch Vá»¥ Ä\u0090äƒng Phæ°æ¡ng" to
                "Công Ty Tnhh Sản Xuất Cơ Khí Và Thương Mại Dịch Vụ Đăng Phương",
        )
        for ((garbled, expected) in cases) assertEquals(garbled, expected, MojibakeRepair.repair(garbled))
    }

    @Test
    fun `correct names are left alone`() {
        val names = listOf(
            "Bãi Gửi Xe Viện Phổi", "Ga Kim Mã", "Bhome Kim Mã", "Hồ Hoàn Kiếm", "Nhung Coffee", "Café Ân", "Trà",
            "211 Kim Mã", "Ngõ 189 Hoàng Hoa Thám", "",
        )
        for (n in names) assertNull(n, MojibakeRepair.repair(n))
    }

    // Minimal MVT writer for the fixture.
    private fun varint(value: Int): ByteArray {
        var v = value.toLong()
        val out = ByteArrayOutputStream()
        while (v >= 0x80) { out.write(((v and 0x7F) or 0x80).toInt()); v = v ushr 7 }
        out.write(v.toInt())
        return out.toByteArray()
    }
    private fun field(n: Int, payload: ByteArray) = varint(n shl 3 or 2) + varint(payload.size) + payload
    private fun value(s: String) = field(4, field(1, s.toByteArray()))
    private fun layer(name: String, values: List<String>): ByteArray {
        val feature = field(2, byteArrayOf(0x10, 0x00))
        val body = varint(15 shl 3) + byteArrayOf(2) + field(1, name.toByteArray()) + feature + field(3, "name".toByteArray()) +
            values.map(::value).fold(ByteArray(0)) { a, b -> a + b } + varint(5 shl 3) + varint(4096)
        return field(3, body)
    }

    /** layers → values → string, decoded with the same wire format. */
    private fun strings(tile: ByteArray): List<String> {
        val found = mutableListOf<String>()
        fun walk(b: ByteArray, from: Int, to: Int, depth: Int) {
            var i = from
            fun vi(): Int { var r = 0; var s = 0; while (true) { val c = b[i++].toInt() and 0xFF; r = r or ((c and 0x7F) shl s); s += 7; if (c < 0x80) return r } }
            while (i < to) {
                val key = vi()
                when (key and 7) {
                    0 -> vi()
                    2 -> {
                        val len = vi()
                        val f = key ushr 3
                        when {
                            depth == 0 && f == 3 -> walk(b, i, i + len, 1)
                            depth == 1 && f == 4 -> walk(b, i, i + len, 2)
                            depth == 2 && f == 1 -> found += String(b, i, len, Charsets.UTF_8)
                        }
                        i += len
                    }
                    else -> return
                }
            }
        }
        walk(tile, 0, tile.size, 0)
        return found
    }

    private fun gzip(b: ByteArray) = ByteArrayOutputStream().also { o -> GZIPOutputStream(o).use { it.write(b) } }.toByteArray()

    @Test
    fun `tile values are rewritten, other bytes survive, clean tiles are untouched`() {
        val tile = layer("point_map", listOf("Bãºn Cháº£", "Hồ Tây")) + layer("streets", listOf("Kim Mã"))
        val fixed = VectorTileRepair.repair(tile)
        assertNotNull(fixed)
        assertEquals(listOf("Bún Chả", "Hồ Tây", "Kim Mã"), strings(fixed!!))
        assertNull(VectorTileRepair.repair(layer("streets", listOf("Kim Mã", "Liễu Giai"))))
        assertNull(VectorTileRepair.repair(byteArrayOf(0x1F, 0x8B.toByte(), 0x08)))
        assertNull("truncated", VectorTileRepair.repair(byteArrayOf(0x1A, 0xFF.toByte())))
        // Gzip-compressed tiles are inflated, repaired and returned uncompressed.
        assertEquals(listOf("Bún Chả", "Hồ Tây", "Kim Mã"), strings(VectorTileRepair.repairMaybeGzipped(gzip(tile))!!))
        assertNull(VectorTileRepair.repairMaybeGzipped(gzip(layer("streets", listOf("Kim Mã")))))
    }

    @Test
    fun `only Goong tile URLs are repaired`() {
        assertTrue(GoongTileRepairer.shouldRepair("https://tiles.goong.io/tiles/composite/16/52031/28849.pbf?api_key=x".toHttpUrl()))
        assertFalse(GoongTileRepairer.shouldRepair("https://tiles.goong.io/assets/goong_map_web.json".toHttpUrl()))
        assertFalse(GoongTileRepairer.shouldRepair("https://example.com/tiles/1/2/3.pbf".toHttpUrl()))
    }

    @Test
    fun `interceptor repairs gzip tiles end to end and passes clean ones through byte for byte`() {
        val garbled = layer("point_map", listOf("Bãºn Cháº£"))
        val clean = layer("point_map", listOf("Hồ Tây"))
        MockWebServer().use { server ->
            server.enqueue(MockResponse.Builder().body(Buffer().write(gzip(garbled))).build())
            server.enqueue(MockResponse.Builder().addHeader("Content-Encoding", "gzip").body(Buffer().write(gzip(garbled))).build())
            server.enqueue(MockResponse.Builder().body(Buffer().write(clean)).build())
            server.enqueue(MockResponse.Builder().body(Buffer().write(garbled)).build())
            server.start()
            val client = OkHttpClient.Builder()
                .addInterceptor(GoongTileRepairInterceptor { it.encodedPath.endsWith(".pbf") })
                .build()
            fun get(path: String) = client.newCall(Request.Builder().url(server.url(path)).build()).execute().use { it.body.bytes() }

            assertEquals(listOf("Bún Chả"), strings(get("/tiles/1/2/3.pbf")))
            assertEquals("Content-Encoding: gzip", listOf("Bún Chả"), strings(get("/tiles/1/2/4.pbf")))
            assertArrayEquals(clean, get("/tiles/1/2/5.pbf"))
            assertEquals(garbled.toByteString(), get("/style.json").toByteString())
        }
    }
}
