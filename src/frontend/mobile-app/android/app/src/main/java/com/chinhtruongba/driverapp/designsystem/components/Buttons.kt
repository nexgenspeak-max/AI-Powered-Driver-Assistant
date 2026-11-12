package com.chinhtruongba.driverapp.designsystem.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.clickable
import com.chinhtruongba.driverapp.designsystem.glass.glassRimBrush
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme

enum class ButtonVariant { Primary, Outline, Dark, Success, Danger }

/** Press feedback shared by every tappable surface: a quick 0.97 squash. */
@Composable
fun Modifier.pressScale(interaction: MutableInteractionSource): Modifier {
    val pressed by interaction.collectIsPressedAsState()
    val s by animateFloatAsState(if (pressed) 0.97f else 1f, label = "press")
    return this.scale(s)
}

/** RN `Button`: 52 dp pill, CTA gradient primary with a violet glow, outline/dark/success/danger. */
@Composable
fun CzenButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
    leadingIcon: CzenIcon? = null,
    minHeight: Dp = 52.dp,
) {
    val c = CzenTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val active = enabled && !loading
    val shape = RoundedCornerShape(50)
    val contentColor = when {
        !enabled -> c.disabledText
        variant == ButtonVariant.Primary -> Color.White
        variant == ButtonVariant.Outline -> c.textPrimary
        variant == ButtonVariant.Dark -> c.textPrimary
        else -> c.onStatusButton
    }
    var m = modifier
        .pressScale(interaction)
        .defaultMinSize(minHeight = minHeight)
    if (enabled && variant == ButtonVariant.Primary) {
        m = m.shadow(if (c.isDark) 10.dp else 14.dp, shape, ambientColor = Brand.Primary, spotColor = Brand.Primary)
    }
    m = m.clip(shape)
    m = when {
        !enabled -> m.background(c.disabledBackground)
        variant == ButtonVariant.Primary -> m.background(Brush.linearGradient(Brand.CtaGradient))
            .drawWithContent {
                drawContent()
                drawRect(Brush.verticalGradient(0f to Color.White.copy(alpha = 0.22f), 0.5f to Color.Transparent))
            }
        variant == ButtonVariant.Outline -> m.border(1.dp, c.borderStrong, shape)
        variant == ButtonVariant.Dark -> m.background(c.surfaceElevated)
        variant == ButtonVariant.Success -> m.background(c.success)
        else -> m.background(c.danger)
    }
    if (variant == ButtonVariant.Primary && enabled) m = m.border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.35f), Color.Transparent)), shape)
    Row(
        modifier = m
            .clickable(
                interactionSource = interaction,
                indication = ripple(color = contentColor),
                enabled = active,
                role = Role.Button,
                onClick = onClick,
            )
            .padding(horizontal = 20.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(20.dp), color = contentColor, strokeWidth = 2.dp)
        } else {
            if (leadingIcon != null) Icon(leadingIcon, size = 20.dp, color = contentColor)
            Text(text, style = CzenTheme.type.bodyStrong, color = contentColor, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

/** RN `GlassButton` (auth CTAs): a glassy violet pill with a specular rim. */
@Composable
fun GlassButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val c = CzenTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val shape = RoundedCornerShape(50)
    Box(
        modifier
            .pressScale(interaction)
            .defaultMinSize(minHeight = 52.dp)
            .shadow(if (enabled) 16.dp else 0.dp, shape, ambientColor = Brand.Primary, spotColor = Brand.Primary)
            .clip(shape)
            .background(
                if (enabled) {
                    Brush.linearGradient(listOf(Brand.Deep, Brand.PrimaryPress, Brand.GradientEnd))
                } else {
                    Brush.linearGradient(listOf(Color(0xFF4A4552), Color(0xFF4A4552)))
                },
            )
            .drawWithContent {
                drawContent()
                drawRect(Brush.verticalGradient(0f to Color.White.copy(alpha = 0.32f), 0.55f to Color.Transparent))
            }
            .border(1.dp, glassRimBrush(c.copy(glassHighlight = Color.White.copy(alpha = 0.7f), glassEdge = Color.White.copy(alpha = 0.08f))), shape)
            .clickable(interaction, ripple(color = Color.White), enabled = enabled && !loading, role = Role.Button, onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
        } else {
            Text(text, style = CzenTheme.type.bodyStrong, color = Color.White)
        }
    }
}

/** Round icon-only button (≥ 48 dp touch target) with an accessible label. */
@Composable
fun IconCircleButton(
    icon: CzenIcon,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 44.dp,
    iconSize: Dp = 22.dp,
    background: Color = CzenTheme.colors.chip,
    tint: Color = CzenTheme.colors.textPrimary,
    enabled: Boolean = true,
) {
    val interaction = remember { MutableInteractionSource() }
    Box(
        modifier
            .defaultMinSize(48.dp, 48.dp)
            .clickable(interaction, null, enabled = enabled, role = Role.Button, onClick = onClick)
            .pressScale(interaction),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier.size(size).clip(CircleShape).background(background),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, size = iconSize, color = tint, contentDescription = contentDescription)
        }
    }
}
