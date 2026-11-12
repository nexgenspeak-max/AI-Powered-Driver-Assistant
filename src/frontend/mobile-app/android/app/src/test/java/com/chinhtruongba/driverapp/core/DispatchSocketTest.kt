package com.chinhtruongba.driverapp.core

import com.chinhtruongba.driverapp.core.realtime.DispatchEvent
import com.chinhtruongba.driverapp.core.realtime.OkHttpDispatchSocket
import com.chinhtruongba.driverapp.core.realtime.PING_INTERVAL_MS
import com.chinhtruongba.driverapp.core.realtime.ReconnectBackoff
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import kotlinx.serialization.json.Json
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Collections

class DispatchSocketTest {
    @Test
    fun `dispatch socket pings every 20 s so half-open connections close and reconnect`() {
        val shared = OkHttpClient()
        val socket = OkHttpDispatchSocket(shared, Json, "ws://localhost/ws")
        assertEquals(20_000L, PING_INTERVAL_MS)
        assertEquals(20_000, socket.socketClient.pingIntervalMillis)
        assertEquals("REST client is left untouched", 0, shared.pingIntervalMillis)
    }

    @Test
    fun `401 handshakes back off exponentially up to 60 s and a successful open resets it`() {
        val b = ReconnectBackoff()
        assertEquals("ordinary drop", 3_000L, b.nextDelay(unauthorized = false))
        assertEquals(
            listOf(3_000L, 6_000L, 12_000L, 24_000L, 48_000L, 60_000L, 60_000L),
            List<Long>(7) { b.nextDelay(unauthorized = true) },
        )
        assertEquals("a non-auth close keeps the auth streak", 3_000L, b.nextDelay(unauthorized = false))
        assertEquals(60_000L, b.nextDelay(unauthorized = true))
        b.onOpened()
        assertEquals(3_000L, b.nextDelay(unauthorized = true))
    }

    @Test
    fun `the socket loop applies the backoff to real 401 handshakes`() = runBlocking {
        val closeOnOpen = object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                webSocket.close(1000, "bye")
            }
        }
        MockWebServer().use { server ->
            repeat(3) { server.enqueue(MockResponse.Builder().code(401).build()) }
            server.enqueue(MockResponse.Builder().webSocketUpgrade(closeOnOpen).build())
            server.enqueue(MockResponse.Builder().code(401).build())
            val echoClose = object : WebSocketListener() {
                override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                    webSocket.close(1000, null)
                }
            }
            server.enqueue(MockResponse.Builder().webSocketUpgrade(echoClose).build())
            server.start()

            val delays = Collections.synchronizedList(mutableListOf<Long>())
            val socket = OkHttpDispatchSocket(
                OkHttpClient(),
                Json,
                server.url("/ws").toString().replaceFirst("http", "ws"),
                sleep = { ms: Long -> delays += ms },
            )
            withTimeout(10_000) {
                socket.events("0901234567").filter { it == DispatchEvent.Opened }.take(2).toList()
            }
            // 3 × 401 → 3, 6, 12 s; the opened socket's close → 3 s; the next 401 starts over at 3 s.
            assertEquals(listOf(3_000L, 6_000L, 12_000L, 3_000L, 3_000L), delays.toList())
        }
    }
}
