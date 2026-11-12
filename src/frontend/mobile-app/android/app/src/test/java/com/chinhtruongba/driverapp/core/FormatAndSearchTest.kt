package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.util.Format
import com.chinhtruongba.driverapp.core.util.Search
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FormatTest {
    @Test fun `VND uses dot thousands and the dong sign`() {
        assertEquals("120.000 ₫", Format.currency(120_000.0))
        assertEquals("1.234.567 ₫", Format.currency(1_234_567.0))
        assertEquals("0 ₫", Format.currency(0.0))
        assertEquals("45.000 ₫", Format.currency(44_999.6))
    }

    @Test fun `km has a decimal comma under 10 and dot grouping above`() {
        assertEquals("4,5 km", Format.km(4.5))
        assertEquals("0,7 km", Format.km(0.65))
        assertEquals("9,9 km", Format.km(9.94))
        assertEquals("12 km", Format.km(12.4))
        assertEquals("1.674 km", Format.km(1674.0))
        assertEquals("", Format.km(null))
        assertEquals("", Format.km(Double.NaN))
    }

    @Test fun `minutes format as phut and gio`() {
        assertEquals("12 phút", Format.minutes(12.0))
        assertEquals("0 phút", Format.minutes(-3.0))
        assertEquals("1 giờ", Format.minutes(60.0))
        assertEquals("1 giờ 05 phút", Format.minutes(65.0))
        assertEquals("2 giờ 30 phút", Format.minutes(150.0))
        assertEquals("", Format.minutes(null))
    }

    @Test fun `route joins eta and distance`() {
        assertEquals("12 phút · 4,5 km", Format.route(12.0, 4.5))
        assertEquals("—", Format.route(null, 4.5))
        assertEquals("—", Format.route(0.0, 4.5))
    }

    @Test fun `bare legacy times are shown as-is`() {
        assertEquals("14:30", Format.time("14:30"))
        assertEquals("—", Format.time(""))
    }

    @Test fun `radius labels`() {
        assertEquals("500 m", Format.radius(500))
        assertEquals("1 km", Format.radius(1000))
        assertEquals("1,5 km", Format.radius(1500))
    }
}

class SearchTest {
    @Test fun `fold strips Vietnamese diacritics and d-bar`() {
        assertEquals("dang my linh", Search.fold("  Đặng   Mỹ Linh "))
        assertEquals("nguyen thu ha", Search.fold("Nguyễn Thu Hà"))
        assertEquals("", Search.fold(null))
    }

    @Test fun `every query word must match some field, accent-insensitive`() {
        assertTrue(Search.matches("nguyen ha", listOf("Nguyễn Thu Hà", "0903111222")))
        assertTrue(Search.matches("0903", listOf("Nguyễn Thu Hà", "0903111222")))
        assertTrue(Search.matches("ĐẶNG", listOf("Đặng Mỹ Linh")))
        assertFalse(Search.matches("nguyen duc", listOf("Nguyễn Thu Hà", null)))
        assertTrue(Search.matches("   ", listOf("anything")))
    }
}
