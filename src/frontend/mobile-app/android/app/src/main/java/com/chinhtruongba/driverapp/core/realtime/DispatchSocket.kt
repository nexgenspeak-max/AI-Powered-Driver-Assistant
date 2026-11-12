package com.chinhtruongba.driverapp.core.realtime

import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.isActive
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.coroutines.coroutineContext

/** `{event, data}` frames from the dispatch WebSocket; [Opened] marks a (re)connect. */
sealed interface DispatchEvent {
    data object Opened : DispatchEvent
    data class Message(val event: String, val data: JsonObject?) : DispatchEvent
}

/** Receive-only realtime channel, open only while the driver is online. */
interface DispatchSocket {
    /** Cold flow: connects on collect, reconnects 3 s after any close, closes on cancel. */
    fun events(phone: String): Flow<DispatchEvent>
}

const val RECONNECT_DELAY_MS = 3_000L

/**
 * WebSocket keepalive. Without pings a half-open TCP connection (NAT timeout, radio switch)
 * never reports a failure, so the 3 s reconnect would never run; OkHttp fails the socket when
 * a pong does not arrive within one interval.
 */
const val PING_INTERVAL_MS = 20_000L

class OkHttpDispatchSocket(
    client: OkHttpClient,
    private val json: Json,
    private val baseWsUrl: String,
) : DispatchSocket {
    /** The shared REST client plus a ping interval (same pool and interceptors, REST calls unchanged). */
    internal val socketClient: OkHttpClient = client.newBuilder()
        .pingInterval(PING_INTERVAL_MS, TimeUnit.MILLISECONDS)
        .build()

    override fun events(phone: String): Flow<DispatchEvent> = flow {
        val url = "$baseWsUrl?role=driver&id=${URLEncoder.encode(phone, "UTF-8")}"
        while (coroutineContext.isActive) {
            singleConnection(url).collect { emit(it) }
            delay(RECONNECT_DELAY_MS)
        }
    }

    private fun singleConnection(url: String): Flow<DispatchEvent> = callbackFlow {
        val ws = socketClient.newWebSocket(
            Request.Builder().url(url).build(),
            object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    trySend(DispatchEvent.Opened)
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    parse(text)?.let { trySend(it) }
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    close()
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    close()
                }
            },
        )
        awaitClose { ws.close(1000, null) }
    }

    private fun parse(text: String): DispatchEvent.Message? = runCatching {
        val obj = json.parseToJsonElement(text).jsonObject
        val event = obj["event"]?.jsonPrimitive?.content ?: return null
        DispatchEvent.Message(event, obj["data"] as? JsonObject)
    }.getOrNull()
}
