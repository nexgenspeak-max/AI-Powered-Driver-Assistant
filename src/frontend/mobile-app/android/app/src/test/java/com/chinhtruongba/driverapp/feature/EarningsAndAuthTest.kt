package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.feature.auth.AuthValidation
import com.chinhtruongba.driverapp.feature.earnings.DayHeading
import com.chinhtruongba.driverapp.feature.earnings.EarningsMath
import com.chinhtruongba.driverapp.feature.earnings.EarningsPeriod
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime

class EarningsMathTest {
    private val zone = ZoneId.systemDefault()
    private val now = ZonedDateTime.of(2026, 11, 12, 15, 0, 0, 0, zone)
    private fun trip(id: String, daysAgo: Long, hour: Int, fare: Double, name: String = "Khách $id") = Trip(
        tripId = id, statusWire = "completed", customerName = name, dropoffAddress = "Văn Miếu",
        updatedAt = now.minusDays(daysAgo).withHour(hour).toOffsetDateTime().toString(), estimatedFare = fare,
    )

    private val trips = listOf(trip("1", 0, 14, 100.0, "Đặng Mỹ Linh"), trip("2", 0, 9, 50.0), trip("3", 1, 20, 70.0), trip("4", 5, 10, 30.0), trip("5", 20, 10, 10.0))

    @Test fun `period filters`() {
        assertEquals(2, EarningsMath.filterForPeriod(trips, EarningsPeriod.Today, now).size)
        assertEquals(4, EarningsMath.filterForPeriod(trips, EarningsPeriod.Week, now).size)
        assertEquals(5, EarningsMath.filterForPeriod(trips, EarningsPeriod.Month, now).size)
    }

    @Test fun `seven day buckets end today with Vietnamese weekday indices`() {
        val days = EarningsMath.lastSevenDays(trips, now.toLocalDate())
        assertEquals(7, days.size)
        assertEquals(150.0, days.last().total, 0.0)
        assertEquals(true, days.last().isToday)
        assertEquals(70.0, days[5].total, 0.0)
        assertEquals(4, days.last().dayOfWeek) // Thursday → T5 (index 4, CN = 0)
    }

    @Test fun `groups by day keep order and sum`() {
        val g = EarningsMath.groupByDay(trips.take(4), now.toLocalDate())
        assertEquals(listOf(DayHeading.Today, DayHeading.Yesterday, DayHeading.Date(LocalDate.of(2026, 11, 7))), g.map { it.heading })
        assertEquals(150.0, g[0].total, 0.0)
    }

    @Test fun `search matches name or address without accents`() {
        assertEquals(listOf("1"), EarningsMath.filterByQuery(trips, "dang linh").map { it.tripId })
        assertEquals(5, EarningsMath.filterByQuery(trips, "van mieu").size)
    }
}

class AuthValidationTest {
    @Test fun `zod rules`() {
        assertEquals(R.string.field_phone_error, AuthValidation.phone("0901"))
        assertNull(AuthValidation.phone("0901234567"))
        assertEquals(R.string.field_password_error, AuthValidation.password("12345"))
        assertNull(AuthValidation.password("123456"))
        assertEquals(R.string.field_email_error, AuthValidation.email("a@b"))
        assertNull(AuthValidation.email("you@example.com"))
        assertEquals(R.string.field_name_error, AuthValidation.name("A"))
        assertEquals(R.string.field_vehicle_type_error, AuthValidation.vehicleType(null))
        assertEquals(R.string.field_plate_error, AuthValidation.plate("36"))
        assertEquals(R.string.field_vehicle_name_error, AuthValidation.vehicleName("H"))
    }
}
