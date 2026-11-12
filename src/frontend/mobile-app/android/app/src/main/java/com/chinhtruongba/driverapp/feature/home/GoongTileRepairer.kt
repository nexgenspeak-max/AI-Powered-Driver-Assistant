package com.chinhtruongba.driverapp.feature.home

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import androidx.core.content.edit
import okhttp3.Dispatcher
import okhttp3.HttpUrl
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import org.maplibre.android.module.http.HttpRequestUtil
import org.maplibre.android.offline.OfflineManager

/**
 * OkHttp interceptor for MapLibre's network layer: Goong vector tiles get their mis-encoded
 * POI names repaired ([VectorTileRepair]) before MapLibre parses and caches them. Correct
 * tiles, other URLs and failed responses pass through byte-for-byte.
 */
class GoongTileRepairInterceptor(
    private val shouldRepair: (HttpUrl) -> Boolean = GoongTileRepairer::shouldRepair,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val response = chain.proceed(chain.request())
        if (!response.isSuccessful || !shouldRepair(response.request.url)) return response
        val body = response.body
        val contentType = body.contentType()
        val bytes = body.bytes()
        val fixed = runCatching { VectorTileRepair.repairMaybeGzipped(bytes) }.getOrNull()
            ?: return response.newBuilder().body(bytes.toResponseBody(contentType)).build()
        // The repaired tile is plain protobuf; the original length/encoding no longer apply.
        return response.newBuilder()
            .removeHeader("Content-Encoding")
            .removeHeader("Content-Length")
            .body(fixed.toResponseBody(contentType))
            .build()
    }
}

/** Installs [GoongTileRepairInterceptor] into MapLibre and drops tiles cached before it existed. */
@SuppressLint("LogNotTimber") // the app has no Timber; one warning-level line, no PII
object GoongTileRepairer {
    private const val PREFS = "map"
    private const val CACHE_KEY = "tileRepair.cacheVersion"
    private const val CACHE_VERSION = 1

    @Volatile
    private var installed = false

    /** `*.goong.io/tiles/….pbf` only. */
    fun shouldRepair(url: HttpUrl): Boolean =
        url.host.endsWith("goong.io") && url.encodedPath.startsWith("/tiles/") && url.encodedPath.endsWith(".pbf")

    /** Idempotent; call after `MapLibre.getInstance` and before the first `MapView`. */
    @Synchronized
    fun install(context: Context) {
        if (installed) return
        installed = true
        // Same dispatcher limits as MapLibre's default client.
        val dispatcher = Dispatcher().apply { maxRequestsPerHost = 20 }
        HttpRequestUtil.setOkHttpClient(
            OkHttpClient.Builder().dispatcher(dispatcher).addInterceptor(GoongTileRepairInterceptor()).build(),
        )
        // Tiles cached before the repair existed would be served as-is; drop them once.
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getInt(CACHE_KEY, 0) < CACHE_VERSION) {
            OfflineManager.getInstance(context).clearAmbientCache(object : OfflineManager.FileSourceCallback {
                override fun onSuccess() {
                    prefs.edit { putInt(CACHE_KEY, CACHE_VERSION) }
                }

                override fun onError(message: String) {
                    Log.w("GoongTileRepairer", "ambient cache clear failed; retry next launch")
                }
            })
        }
    }
}
