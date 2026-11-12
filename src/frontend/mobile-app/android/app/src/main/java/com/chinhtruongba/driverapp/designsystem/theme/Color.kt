package com.chinhtruongba.driverapp.designsystem.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/** Brand colours shared by both themes (parity-map §5). */
object Brand {
    val Primary = Color(0xFF8B5CF6)
    val PrimaryPress = Color(0xFF7C3AED)
    val PrimaryMuted = Color(0x298B5CF6) // rgba(139,92,246,0.16)
    val GradientStart = Color(0xFF7C3AED)
    val GradientEnd = Color(0xFFA855F7)
    val Deep = Color(0xFF5B21B6)
    val OrbEnd = Color(0xFF9F67FA)
    val Dark = Color(0xFF121212)
    val Accent = Color(0xFF232325)
    val AccentLight = Color(0xFFC4B5FD)
    val TextInverse = Color(0xFFFFFFFF)
    val LauncherBackground = Color(0xFF6D28D9)

    val CtaGradient = listOf(GradientStart, GradientEnd)
    val OrbIdle = listOf(Deep, PrimaryPress, OrbEnd)
    val OrbLayerA = listOf(Color(0xFF7C3AED), Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFFC4B5FD))
    val OrbLayerB = listOf(Color(0xFF6D28D9), Color(0xFF9333EA), Color(0xFFA855F7), Color(0xFFDDD6FE))

    /** Map stop/trip colours cycle (parity-map §6). */
    val TripColors = listOf(
        Color(0xFF2563EB), Color(0xFF16A34A), Color(0xFFF97316), Color(0xFFDB2777),
        Color(0xFF0891B2), Color(0xFFA16207), Color(0xFFDC2626), Color(0xFF4F46E5),
    )
    val NavRoute = Color(0xFF2563EB)
}

/** Every palette token the RN theme exposes, for both themes. */
@Immutable
data class CzenColors(
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val surfaceHigh: Color,
    val surfaceVariant: Color,
    val chip: Color,
    val chipSelected: Color,
    val onSurfaceVariant: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val border: Color,
    val borderStrong: Color,
    val outline: Color,
    val outlineVariant: Color,
    val divider: Color,
    val inputBorder: Color,
    val primary: Color,
    val primaryContainer: Color,
    val onPrimaryContainer: Color,
    val secondary: Color,
    val secondaryContainer: Color,
    val onSecondaryContainer: Color,
    val success: Color,
    val successContainer: Color,
    val onSuccessContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val onWarningContainer: Color,
    val danger: Color,
    val dangerContainer: Color,
    val onDangerContainer: Color,
    val info: Color,
    val infoContainer: Color,
    val onInfoContainer: Color,
    val disabledBackground: Color,
    val disabledText: Color,
    val pressed: Color,
    val navigationBar: Color,
    val snackbar: Color,
    val onSnackbar: Color,
    val ringTrack: Color,
    /** Text on success/danger buttons (dark theme uses #111827). */
    val onStatusButton: Color,
    // Auth theme (src/theme.ts)
    val authBackground: Color,
    val authGradient: List<Color>,
    val authCard: Color,
    val authField: Color,
    val authFieldRing: Color,
    val authTitle: Color,
    // Glass material
    val glassTint: Color,
    val glassFallback: Color,
    val glassHighlight: Color,
    val glassEdge: Color,
    val shadow: Color,
)

val LightCzenColors = CzenColors(
    isDark = false,
    background = Color(0xFFF4F6FB),
    surface = Color(0xFFF4F6FB),
    surfaceElevated = Color(0xFFFFFFFF),
    surfaceHigh = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFEEE9F3),
    chip = Color(0xFFEEE9F3),
    chipSelected = Color(0xFFEDE9FE),
    onSurfaceVariant = Color(0xFF5B5566),
    textPrimary = Color(0xFF111827),
    textSecondary = Color(0xFF4B5563),
    textMuted = Color(0xFF6B7280),
    border = Color(0xFFE5E7EB),
    borderStrong = Color(0xFFD1D5DB),
    outline = Color(0xFFD9D2E3),
    outlineVariant = Color(0xFFEDE8F2),
    divider = Color(0x14111827),
    inputBorder = Color(0xFFD9D2E3),
    primary = Brand.Primary,
    primaryContainer = Color(0xFFEDE9FE),
    onPrimaryContainer = Color(0xFF4C1D95),
    secondary = Color(0xFFA855F7),
    secondaryContainer = Color(0xFFF3E8FF),
    onSecondaryContainer = Color(0xFF5B21B6),
    success = Color(0xFF16A34A),
    successContainer = Color(0xFFDCFCE7),
    onSuccessContainer = Color(0xFF14532D),
    warning = Color(0xFFF59E0B),
    warningContainer = Color(0xFFFEF3C7),
    onWarningContainer = Color(0xFF78350F),
    danger = Color(0xFFEF4444),
    dangerContainer = Color(0xFFFEE2E2),
    onDangerContainer = Color(0xFF7F1D1D),
    info = Color(0xFF3B82F6),
    infoContainer = Color(0xFFDBEAFE),
    onInfoContainer = Color(0xFF1E3A8A),
    disabledBackground = Color(0x14111827),
    disabledText = Color(0x61111827),
    pressed = Color(0x1F8B5CF6),
    navigationBar = Color(0xB3FFFFFF),
    snackbar = Color(0xFF2D2438),
    onSnackbar = Color(0xFFFFFFFF),
    ringTrack = Color(0xFFEDE9FE),
    onStatusButton = Color(0xFFFFFFFF),
    authBackground = Color(0xFFF5F4F8),
    authGradient = listOf(Color(0xFFEDE9FE), Color(0xFFF5F4F8), Color(0xFFF5F4F8)),
    authCard = Color(0xF0FFFFFF),
    authField = Color(0x8CFFFFFF),
    authFieldRing = Color(0xFFD1D5DB),
    authTitle = Color(0xFF000000),
    glassTint = Color(0x99FFFFFF), // white ~60 %
    glassFallback = Color(0xE6FFFFFF),
    glassHighlight = Color(0xE6FFFFFF),
    glassEdge = Color(0x1F111827),
    shadow = Color(0xFF110C20),
)

val DarkCzenColors = CzenColors(
    isDark = true,
    background = Color(0xFF1A1420),
    surface = Color(0xFF1A1420),
    surfaceElevated = Color(0xFF241D2C),
    surfaceHigh = Color(0xFF2E2438),
    surfaceVariant = Color(0xFF2E2438),
    chip = Color(0xFF2E2438),
    chipSelected = Color(0x3D8B5CF6),
    onSurfaceVariant = Color(0xFFB7B2C0),
    textPrimary = Color(0xFFF5F5F7),
    textSecondary = Color(0xFFA1A1A6),
    textMuted = Color(0xFF6E6E73),
    border = Color(0x0FFFFFFF),
    borderStrong = Color(0x24FFFFFF),
    outline = Color(0x29FFFFFF),
    outlineVariant = Color(0x0FFFFFFF),
    divider = Color(0x0FFFFFFF),
    inputBorder = Color(0x24FFFFFF),
    primary = Brand.Primary,
    primaryContainer = Color(0xFF2E2250),
    onPrimaryContainer = Color(0xFFDDD6FE),
    secondary = Color(0xFFC084FC),
    secondaryContainer = Color(0xFF3B2A52),
    onSecondaryContainer = Color(0xFFEAD9FB),
    success = Color(0xFF34D399),
    successContainer = Color(0x2934D399),
    onSuccessContainer = Color(0xFF6EE7B7),
    warning = Color(0xFFFBBF24),
    warningContainer = Color(0x29FBBF24),
    onWarningContainer = Color(0xFFFCD34D),
    danger = Color(0xFFF87171),
    dangerContainer = Color(0x29F87171),
    onDangerContainer = Color(0xFFFCA5A5),
    info = Color(0xFF60A5FA),
    infoContainer = Color(0x2960A5FA),
    onInfoContainer = Color(0xFF93C5FD),
    disabledBackground = Color(0x14FFFFFF),
    disabledText = Color(0x61FFFFFF),
    pressed = Color(0x338B5CF6),
    navigationBar = Color(0x6B5A3C78),
    snackbar = Color(0xFF2D2438),
    onSnackbar = Color(0xFFFFFFFF),
    ringTrack = Color(0xFF2E2250),
    onStatusButton = Color(0xFF111827),
    authBackground = Color(0xFF121212),
    authGradient = listOf(Color(0xFF2A1B4D), Color(0xFF1A1420), Color(0xFF121212)),
    authCard = Color(0xFF2A2438),
    authField = Color(0x0DFFFFFF),
    authFieldRing = Color(0x0DFFFFFF),
    authTitle = Color(0xFFFFFFFF),
    glassTint = Color(0x6B5A3C78), // rgba(90,60,120,0.42)
    glassFallback = Color(0xE62A2034),
    glassHighlight = Color(0x59FFFFFF),
    glassEdge = Color(0x14FFFFFF),
    shadow = Color(0xFF000000),
)

/** Tamagui v3 scale step 4 (background) / step 11 (text) per status family. */
@Immutable
data class BadgeColors(val background: Color, val content: Color)

enum class BadgeTone { Yellow, Blue, Purple, Green, Red, Orange, Pink, Gray }

fun badgeColors(tone: BadgeTone, dark: Boolean): BadgeColors = if (!dark) {
    when (tone) {
        BadgeTone.Yellow -> BadgeColors(Color(0xFFFFF7C2), Color(0xFF9E6C00))
        BadgeTone.Blue -> BadgeColors(Color(0xFFE6F4FE), Color(0xFF0D74CE))
        BadgeTone.Purple -> BadgeColors(Color(0xFFF2E2FC), Color(0xFF8145B5))
        BadgeTone.Green -> BadgeColors(Color(0xFFD6F1DF), Color(0xFF218358))
        BadgeTone.Red -> BadgeColors(Color(0xFFFFDBDC), Color(0xFFCE2C31))
        BadgeTone.Orange -> BadgeColors(Color(0xFFFFE8D7), Color(0xFFCC4E00))
        BadgeTone.Pink -> BadgeColors(Color(0xFFFCE5F3), Color(0xFFC2298A))
        BadgeTone.Gray -> BadgeColors(Color(0xFFE8E8E8), Color(0xFF646464))
    }
} else {
    when (tone) {
        BadgeTone.Yellow -> BadgeColors(Color(0xFF302008), Color(0xFFF5E147))
        BadgeTone.Blue -> BadgeColors(Color(0xFF002D59), Color(0xFF70B8FF))
        BadgeTone.Purple -> BadgeColors(Color(0xFF3D1D4D), Color(0xFFD19DFF))
        BadgeTone.Green -> BadgeColors(Color(0xFF113B29), Color(0xFF3DD68C))
        BadgeTone.Red -> BadgeColors(Color(0xFF500F1C), Color(0xFFFF9592))
        BadgeTone.Orange -> BadgeColors(Color(0xFF461A00), Color(0xFFFFA057))
        BadgeTone.Pink -> BadgeColors(Color(0xFF4B143D), Color(0xFFFF8DCC))
        BadgeTone.Gray -> BadgeColors(Color(0xFF2A2A2A), Color(0xFFB4B4B4))
    }
}
