package com.chinhtruongba.driverapp.feature

import com.chinhtruongba.driverapp.app.TripOfferStore
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.feature.trips.OFFER_SECONDS
import com.chinhtruongba.driverapp.feature.trips.OfferSession
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.currentTime
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class OfferSessionTest {
    private val phone = "0901234567"
    private val trips = mutableMapOf<String, Trip>()
    private var failFetch = false
    private val store = TripOfferStore()

    private fun offered(id: String, status: String = "notified") = Trip(tripId = id, statusWire = status, driverPhone = phone)

    private fun TestScope.session(): OfferSession {
        val offer = OfferSession(
            store = store,
            fetchTrip = { id -> if (failFetch) error("offline") else trips.getValue(id) },
            phone = { phone },
            now = { currentTime },
        )
        backgroundScope.launch { offer.run() }
        return offer
    }

    @Test
    fun `the countdown of an older offer does not dismiss a newer one`() = runTest {
        trips["a"] = offered("a")
        trips["b"] = offered("b")
        val offer = session()

        store.show("a")
        advanceTimeBy(20_000)
        store.show("b")
        advanceTimeBy(15_000) // 35 s after "a" rang, 15 s after "b"
        runCurrent()

        assertEquals("b", store.tripId.value)
        assertEquals("b", offer.ui.value.trip?.tripId)
        assertEquals(OFFER_SECONDS - 15, offer.ui.value.secondsLeft)

        advanceTimeBy(15_500)
        runCurrent()
        assertNull("its own 30 s ran out", store.tripId.value)
    }

    @Test
    fun `a revalidation dismisses an offer that was answered elsewhere`() = runTest {
        trips["a"] = offered("a")
        val offer = session()
        store.show("a")
        runCurrent()
        assertEquals("a", offer.ui.value.trip?.tripId)

        trips["a"] = offered("a", status = "confirmed")
        store.revalidate() // socket reopened or schedule_updated
        runCurrent()

        assertNull(store.tripId.value)
        assertNull(offer.ui.value.tripId)
    }

    @Test
    fun `a failed re-check keeps the sheet and a failed first load closes it`() = runTest {
        trips["a"] = offered("a")
        val offer = session()
        store.show("a")
        runCurrent()

        failFetch = true
        store.revalidate()
        runCurrent()
        assertEquals("a", store.tripId.value)
        assertEquals("a", offer.ui.value.trip?.tripId)

        store.show("b")
        runCurrent()
        assertNull("nothing to show for b", store.tripId.value)
    }
}
