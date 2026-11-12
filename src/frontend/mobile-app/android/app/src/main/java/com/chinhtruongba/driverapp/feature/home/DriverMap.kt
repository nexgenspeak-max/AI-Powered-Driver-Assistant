package com.chinhtruongba.driverapp.feature.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.chinhtruongba.driverapp.BuildConfig
import com.chinhtruongba.driverapp.core.model.LatLng
import org.maplibre.android.MapLibre
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.camera.CameraUpdateFactory
import org.maplibre.android.geometry.LatLngBounds
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapLibreMapOptions
import org.maplibre.android.maps.MapView
import org.maplibre.android.maps.Style
import org.maplibre.android.style.expressions.Expression
import org.maplibre.android.style.layers.LineLayer
import org.maplibre.android.style.layers.Property
import org.maplibre.android.style.layers.PropertyFactory
import org.maplibre.android.style.layers.SymbolLayer
import org.maplibre.android.style.sources.GeoJsonSource
import java.util.Locale
import org.maplibre.android.geometry.LatLng as MlLatLng

/** Default centre Hà Nội [105.8342, 21.0278], zoom 12. */
private val DEFAULT_CENTER = MlLatLng(21.0278, 105.8342)
private const val DEFAULT_ZOOM = 12.0

/** Minimal style used when no Goong key is configured, so the screen still renders. */
private const val FALLBACK_STYLE =
    """{"version":8,"name":"czen-fallback","sources":{},"layers":[{"id":"bg","type":"background","paint":{"background-color":"#ECE9F1"}}]}"""

fun goongStyleUrl(key: String): String = "https://tiles.goong.io/assets/goong_map_web.json?api_key=$key"

/** Brand primary #8B5CF6 (optimized route) — parity-map §6 "Layers". */
private const val ROUTE_COLOR = "#8B5CF6"
private const val SRC_ROUTE = "czen-route"
private const val SRC_NAV = "czen-nav"
private const val SRC_STOPS = "czen-stops"
private const val SRC_DRIVER = "czen-driver"
private const val IMG_DRIVER = "czen-driver-img"

private fun LatLng.ml() = MlLatLng(lat, lng)

private fun coord(p: LatLng) = String.format(Locale.US, "[%.6f,%.6f]", p.lng, p.lat)

private fun lineFeature(points: List<LatLng>): String =
    if (points.size < 2) EMPTY_FC
    else """{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[${points.joinToString(",") { coord(it) }}]}}"""

private fun pointFeature(p: LatLng, props: String) =
    """{"type":"Feature","properties":{$props},"geometry":{"type":"Point","coordinates":${coord(p)}}}"""

private const val EMPTY_FC = """{"type":"FeatureCollection","features":[]}"""

/** Inputs the camera rules care about (parity-map §6 "Camera"). */
data class CameraInputs(
    val driver: LatLng?,
    val hasLiveFix: Boolean,
    val heading: Float?,
    val navigating: Boolean,
    val recenterTick: Int,
    val points: List<LatLng>,
)

/**
 * Full-bleed MapLibre map with the Goong style: optimized route, navigation route, stop pills
 * and the driver marker. TextureView mode so Haze can sample it for the glass chrome.
 */
@Composable
fun DriverMap(
    state: HomeUiState,
    fitPaddingTop: Dp,
    fitPaddingBottom: Dp,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var map by remember { mutableStateOf<MapLibreMap?>(null) }
    var style by remember { mutableStateOf<Style?>(null) }
    val bitmaps = remember { MarkerBitmaps(context) }

    val mapView = remember {
        MapLibre.getInstance(context)
        GoongTileRepairer.install(context)
        val options = MapLibreMapOptions.createFromAttributes(context)
            .textureMode(true)
            .logoEnabled(false)
            .attributionEnabled(false)
            .compassEnabled(false)
            .camera(CameraPosition.Builder().target(DEFAULT_CENTER).zoom(DEFAULT_ZOOM).build())
        MapView(context, options)
    }

    DisposableEffect(lifecycle, mapView) {
        val observer = LifecycleEventObserver { _, e ->
            when (e) {
                Lifecycle.Event.ON_CREATE -> mapView.onCreate(null)
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_RESUME -> mapView.onResume()
                Lifecycle.Event.ON_PAUSE -> mapView.onPause()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> Unit
            }
        }
        lifecycle.addObserver(observer)
        onDispose {
            lifecycle.removeObserver(observer)
            if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) mapView.onPause()
            if (lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) mapView.onStop()
            mapView.onDestroy()
        }
    }

    LaunchedEffect(mapView) {
        mapView.getMapAsync { m ->
            m.uiSettings.isLogoEnabled = false
            m.uiSettings.isAttributionEnabled = false
            m.uiSettings.isCompassEnabled = false
            m.uiSettings.isRotateGesturesEnabled = true
            val key = BuildConfig.GOONG_MAPS_KEY
            val builder = if (key.isBlank()) Style.Builder().fromJson(FALLBACK_STYLE) else Style.Builder().fromUri(goongStyleUrl(key))
            m.setStyle(builder.withImage(IMG_DRIVER, bitmaps.driver())) { s ->
                installLayers(s)
                style = s
            }
            map = m
        }
    }

    // ---- data ----
    val s = style
    LaunchedEffect(s, state.routeLine, state.nav.active) {
        s?.getSourceAs<GeoJsonSource>(SRC_ROUTE)?.setGeoJson(if (state.nav.active) EMPTY_FC else lineFeature(state.routeLine))
    }
    LaunchedEffect(s, state.nav.path, state.nav.active) {
        s?.getSourceAs<GeoJsonSource>(SRC_NAV)?.setGeoJson(if (state.nav.active) lineFeature(state.nav.path) else EMPTY_FC)
    }
    LaunchedEffect(s, state.stops) {
        val st = s ?: return@LaunchedEffect
        val features = state.stops.map { stop ->
            val img = "czen-stop-${stop.key}-${stop.order ?: 0}"
            st.addImage(img, bitmaps.stop(stop))
            // Later stops in the order draw under earlier ones.
            pointFeature(stop.latLng, """"icon":"$img","sort":${-(stop.order ?: 99)}""")
        }
        st.getSourceAs<GeoJsonSource>(SRC_STOPS)?.setGeoJson("""{"type":"FeatureCollection","features":[${features.joinToString(",")}]}""")
    }
    LaunchedEffect(s, state.driver) {
        val d = state.driver
        s?.getSourceAs<GeoJsonSource>(SRC_DRIVER)?.setGeoJson(if (d == null) EMPTY_FC else pointFeature(d, ""))
    }

    // ---- camera ----
    val camera = CameraInputs(
        driver = state.driver,
        hasLiveFix = state.hasLiveFix,
        heading = state.heading,
        navigating = state.nav.active,
        recenterTick = state.recenterTick,
        points = listOfNotNull(state.driver) + state.stops.map { it.latLng },
    )
    val memo = remember { CameraMemo() }
    val m = map
    LaunchedEffect(m, s, camera) {
        if (m == null || s == null) return@LaunchedEffect
        val px = { v: Dp -> with(density) { v.roundToPx() } }
        applyCamera(m, camera, memo, fitTop = px(fitPaddingTop), fitSide = px(60.dp), fitBottom = px(fitPaddingBottom))
    }

    AndroidView(factory = { mapView }, modifier = modifier)
}

private class CameraMemo {
    var firstFixDone = false
    var lastRecenter = 0
    var wasNavigating = false
    var lastDriver: LatLng? = null
    var fittedKey: String? = null
}

private fun applyCamera(m: MapLibreMap, c: CameraInputs, memo: CameraMemo, fitTop: Int, fitSide: Int, fitBottom: Int) {
    val d = c.driver
    val recenter = c.recenterTick != memo.lastRecenter
    memo.lastRecenter = c.recenterTick
    when {
        c.navigating && d != null -> {
            // Navigating: zoom 17.5, pitch 45, bearing = GPS heading, 500 ms.
            val pos = CameraPosition.Builder().target(d.ml()).zoom(17.5).tilt(45.0)
                .bearing(c.heading?.toDouble() ?: m.cameraPosition.bearing).build()
            m.animateCamera(CameraUpdateFactory.newCameraPosition(pos), 500)
            memo.wasNavigating = true
        }
        memo.wasNavigating && !c.navigating -> {
            memo.wasNavigating = false
            val pos = CameraPosition.Builder().target((d ?: LatLng(m.cameraPosition.target?.latitude ?: 0.0, m.cameraPosition.target?.longitude ?: 0.0)).ml())
                .zoom(15.0).tilt(0.0).bearing(0.0).build()
            m.animateCamera(CameraUpdateFactory.newCameraPosition(pos), 600)
        }
        recenter && d != null -> m.animateCamera(CameraUpdateFactory.newLatLngZoom(d.ml(), if (c.navigating) 17.5 else 15.0), 600)
        c.hasLiveFix && d != null && !memo.firstFixDone -> {
            memo.firstFixDone = true
            m.animateCamera(CameraUpdateFactory.newLatLngZoom(d.ml(), 15.0), 600)
        }
        c.hasLiveFix && d != null -> {
            if (memo.lastDriver != d) m.animateCamera(CameraUpdateFactory.newLatLng(d.ml()), 800)
        }
        !c.hasLiveFix && c.points.isNotEmpty() -> {
            val key = c.points.joinToString("|") { "${it.lat},${it.lng}" }
            if (memo.fittedKey != key) {
                memo.fittedKey = key
                if (c.points.size == 1) {
                    m.animateCamera(CameraUpdateFactory.newLatLngZoom(c.points[0].ml(), 14.0), 600)
                } else {
                    val b = LatLngBounds.Builder().apply { c.points.forEach { include(it.ml()) } }.build()
                    runCatching { m.animateCamera(CameraUpdateFactory.newLatLngBounds(b, fitSide, fitTop, fitSide, fitBottom), 600) }
                }
            }
        }
    }
    memo.lastDriver = d
}

private fun installLayers(s: Style) {
    s.addSource(GeoJsonSource(SRC_ROUTE, EMPTY_FC))
    s.addSource(GeoJsonSource(SRC_NAV, EMPTY_FC))
    s.addSource(GeoJsonSource(SRC_STOPS, EMPTY_FC))
    s.addSource(GeoJsonSource(SRC_DRIVER, EMPTY_FC))
    s.addLayer(
        LineLayer("czen-route-line", SRC_ROUTE).withProperties(
            PropertyFactory.lineColor(ROUTE_COLOR),
            PropertyFactory.lineWidth(3f),
            PropertyFactory.lineOpacity(0.85f),
            PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
            PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
        ),
    )
    s.addLayer(
        LineLayer("czen-nav-line", SRC_NAV).withProperties(
            PropertyFactory.lineColor("#2563EB"),
            PropertyFactory.lineWidth(6f),
            PropertyFactory.lineOpacity(0.9f),
            PropertyFactory.lineCap(Property.LINE_CAP_ROUND),
            PropertyFactory.lineJoin(Property.LINE_JOIN_ROUND),
        ),
    )
    s.addLayer(
        SymbolLayer("czen-stops-layer", SRC_STOPS).withProperties(
            PropertyFactory.iconImage(Expression.get("icon")),
            PropertyFactory.iconAnchor(Property.ICON_ANCHOR_BOTTOM),
            PropertyFactory.iconAllowOverlap(true),
            PropertyFactory.iconIgnorePlacement(true),
            PropertyFactory.symbolSortKey(Expression.get("sort")),
        ),
    )
    s.addLayer(
        SymbolLayer("czen-driver-layer", SRC_DRIVER).withProperties(
            PropertyFactory.iconImage(IMG_DRIVER),
            PropertyFactory.iconAnchor(Property.ICON_ANCHOR_CENTER),
            PropertyFactory.iconAllowOverlap(true),
            PropertyFactory.iconIgnorePlacement(true),
        ),
    )
}
