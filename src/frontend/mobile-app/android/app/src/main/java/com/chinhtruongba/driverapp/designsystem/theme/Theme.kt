package com.chinhtruongba.driverapp.designsystem.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chinhtruongba.driverapp.R

val Inter = FontFamily(
    Font(R.font.inter_400, FontWeight.Normal),
    Font(R.font.inter_500, FontWeight.Medium),
    Font(R.font.inter_600, FontWeight.SemiBold),
    Font(R.font.inter_700, FontWeight.Bold),
)

/** AppText variants from the RN app (size / line height / weight). */
@Immutable
data class CzenType(
    val display: TextStyle = TextStyle(fontFamily = Inter, fontSize = 28.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.3).sp),
    val h1: TextStyle = TextStyle(fontFamily = Inter, fontSize = 22.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, letterSpacing = (-0.2).sp),
    val h2: TextStyle = TextStyle(fontFamily = Inter, fontSize = 18.sp, lineHeight = 24.sp, fontWeight = FontWeight.SemiBold),
    val title: TextStyle = TextStyle(fontFamily = Inter, fontSize = 16.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold),
    val body: TextStyle = TextStyle(fontFamily = Inter, fontSize = 15.sp, lineHeight = 22.sp, fontWeight = FontWeight.Normal),
    val bodyStrong: TextStyle = TextStyle(fontFamily = Inter, fontSize = 15.sp, lineHeight = 22.sp, fontWeight = FontWeight.SemiBold),
    val label: TextStyle = TextStyle(fontFamily = Inter, fontSize = 13.sp, lineHeight = 18.sp, fontWeight = FontWeight.Medium),
    val caption: TextStyle = TextStyle(fontFamily = Inter, fontSize = 12.sp, lineHeight = 16.sp, fontWeight = FontWeight.Normal),
    val tab: TextStyle = TextStyle(fontFamily = Inter, fontSize = 11.sp, lineHeight = 14.sp, fontWeight = FontWeight.Medium),
)

object Radii {
    val card = 24.dp
    val control = 14.dp
    val bubble = 22.dp
    val input = 12.dp
    val authField = 16.dp
    val sheet = 28.dp
    val solidCard = 20.dp
}

object Spacing {
    val s1 = 4.dp
    val s2 = 8.dp
    val s3 = 12.dp
    val s4 = 16.dp
    val s5 = 20.dp
    val s6 = 24.dp
    val s7 = 28.dp
    val s8 = 32.dp
    val s9 = 40.dp
    val s10 = 48.dp
    val gutter = 20.dp
}

val LocalCzenColors = staticCompositionLocalOf { DarkCzenColors }
val LocalCzenType = staticCompositionLocalOf { CzenType() }

object CzenTheme {
    val colors: CzenColors
        @Composable get() = LocalCzenColors.current
    val type: CzenType
        @Composable get() = LocalCzenType.current
}

/** Parity palette mapped onto Material 3 roles (dynamic colour is off — the brand matters). */
private fun CzenColors.toColorScheme(): ColorScheme = if (isDark) {
    darkColorScheme(
        primary = primary, onPrimary = Brand.TextInverse,
        primaryContainer = primaryContainer, onPrimaryContainer = onPrimaryContainer,
        secondary = secondary, onSecondary = Brand.Dark,
        secondaryContainer = secondaryContainer, onSecondaryContainer = onSecondaryContainer,
        tertiary = info, onTertiary = Brand.Dark,
        background = background, onBackground = textPrimary,
        surface = surface, onSurface = textPrimary,
        surfaceVariant = surfaceVariant, onSurfaceVariant = onSurfaceVariant,
        surfaceContainerLowest = background, surfaceContainerLow = surfaceElevated,
        surfaceContainer = surfaceElevated, surfaceContainerHigh = surfaceHigh,
        surfaceContainerHighest = surfaceHigh,
        error = danger, onError = Brand.Dark, errorContainer = dangerContainer, onErrorContainer = onDangerContainer,
        outline = outline, outlineVariant = outlineVariant,
        inverseSurface = snackbar, inverseOnSurface = onSnackbar, inversePrimary = Brand.AccentLight,
        scrim = Brand.Dark,
    )
} else {
    lightColorScheme(
        primary = primary, onPrimary = Brand.TextInverse,
        primaryContainer = primaryContainer, onPrimaryContainer = onPrimaryContainer,
        secondary = secondary, onSecondary = Brand.TextInverse,
        secondaryContainer = secondaryContainer, onSecondaryContainer = onSecondaryContainer,
        tertiary = info, onTertiary = Brand.TextInverse,
        background = background, onBackground = textPrimary,
        surface = surface, onSurface = textPrimary,
        surfaceVariant = surfaceVariant, onSurfaceVariant = onSurfaceVariant,
        surfaceContainerLowest = surfaceElevated, surfaceContainerLow = surfaceElevated,
        surfaceContainer = surfaceElevated, surfaceContainerHigh = surfaceHigh,
        surfaceContainerHighest = surfaceVariant,
        error = danger, onError = Brand.TextInverse, errorContainer = dangerContainer, onErrorContainer = onDangerContainer,
        outline = outline, outlineVariant = outlineVariant,
        inverseSurface = snackbar, inverseOnSurface = onSnackbar, inversePrimary = Brand.AccentLight,
        scrim = Brand.Dark,
    )
}

private fun CzenType.toTypography() = Typography(
    displaySmall = display,
    headlineMedium = h1,
    headlineSmall = h1,
    titleLarge = h2,
    titleMedium = title,
    titleSmall = label,
    bodyLarge = body,
    bodyMedium = body,
    bodySmall = caption,
    labelLarge = bodyStrong,
    labelMedium = label,
    labelSmall = caption,
)

private val CzenShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(Radii.input),
    medium = RoundedCornerShape(Radii.control),
    large = RoundedCornerShape(Radii.solidCard),
    extraLarge = RoundedCornerShape(Radii.sheet),
)

@Composable
fun CzenTheme(dark: Boolean, content: @Composable () -> Unit) {
    val colors = if (dark) DarkCzenColors else LightCzenColors
    val type = CzenType()
    CompositionLocalProvider(LocalCzenColors provides colors, LocalCzenType provides type) {
        MaterialTheme(
            colorScheme = colors.toColorScheme(),
            typography = type.toTypography(),
            shapes = CzenShapes,
            content = content,
        )
    }
}
