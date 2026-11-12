package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.realtime.OkHttpDispatchSocket
import com.chinhtruongba.driverapp.core.realtime.PING_INTERVAL_MS
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Test

class DispatchSocketTest {
    @Test
    fun `dispatch socket pings every 20 s so half-open connections close and reconnect`() {
        val shared = OkHttpClient()
        val socket = OkHttpDispatchSocket(shared, Json, "ws://localhost/ws")
        assertEquals(20_000L, PING_INTERVAL_MS)
        assertEquals(20_000, socket.socketClient.pingIntervalMillis)
        assertEquals("REST client is left untouched", 0, shared.pingIntervalMillis)
    }
}
