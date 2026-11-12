package com.chinhtruongba.driverapp.designsystem.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.BadgeTone
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.designsystem.theme.Radii
import com.chinhtruongba.driverapp.designsystem.theme.badgeColors

/** RN `Toggle`: 52×32 track, white thumb; on colour success by default. */
@Composable
fun CzenToggle(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    onColor: Color = CzenTheme.colors.success,
    enabled: Boolean = true,
) {
    val c = CzenTheme.colors
    val track by animateColorAsState(if (checked) onColor else c.borderStrong, label = "track")
    val x by animateDpAsState(if (checked) 22.dp else 2.dp, spring(dampingRatio = 0.7f, stiffness = 600f), label = "thumb")
    Box(
        modifier
            .size(52.dp, 48.dp)
            .toggleable(checked, enabled = enabled, role = Role.Switch, onValueChange = onCheckedChange)
            .semantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier.size(52.dp, 32.dp).clip(RoundedCornerShape(50)).background(track).alpha(if (enabled) 1f else 0.5f),
        ) {
            Box(
                Modifier
                    .offset { IntOffset(x.roundToPx(), 2.dp.roundToPx()) }
                    .size(28.dp)
                    .shadow(3.dp, CircleShape)
                    .clip(CircleShape)
                    .background(Color.White),
            )
        }
    }
}

/** RN `SegmentedControl`: 48 dp track in surfaceVariant, gradient pill for the active segment. */
@Composable
fun SegmentedControl(
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = CzenTheme.colors
    BoxWithConstraints(
        modifier
            .fillMaxWidth()
            .height(48.dp)
            .clip(RoundedCornerShape(Radii.control))
            .background(c.surfaceVariant)
            .padding(4.dp),
    ) {
        val segW = maxWidth / options.size
        val x by animateDpAsState(segW * selectedIndex, spring(dampingRatio = 0.8f, stiffness = 500f), label = "seg")
        Box(
            Modifier
                .offset { IntOffset(x.roundToPx(), 0) }
                .width(segW)
                .fillMaxHeight()
                .shadow(6.dp, RoundedCornerShape(Radii.control - 2.dp), ambientColor = Brand.Primary, spotColor = Brand.Primary)
                .clip(RoundedCornerShape(Radii.control - 2.dp))
                .background(Brush.linearGradient(Brand.CtaGradient)),
        )
        Row(Modifier.fillMaxWidth().fillMaxHeight()) {
            options.forEachIndexed { i, label ->
                val selected = i == selectedIndex
                Box(
                    Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(Radii.control - 2.dp))
                        .clickable(role = Role.Tab) { onSelect(i) }
                        .semantics { this.selected = selected },
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        style = CzenTheme.type.label,
                        color = if (selected) Color.White else c.textSecondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
fun Badge(text: String, tone: BadgeTone, modifier: Modifier = Modifier) {
    val bc = badgeColors(tone, CzenTheme.colors.isDark)
    Text(
        text,
        style = CzenTheme.type.caption.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium),
        color = bc.content,
        maxLines = 1,
        modifier = modifier.clip(RoundedCornerShape(50)).background(bc.background).padding(horizontal = 10.dp, vertical = 3.dp),
    )
}

@Composable
fun ColorBadge(text: String, background: Color, content: Color, modifier: Modifier = Modifier) {
    Text(
        text,
        style = CzenTheme.type.caption,
        color = content,
        maxLines = 1,
        modifier = modifier.clip(RoundedCornerShape(50)).background(background).padding(horizontal = 10.dp, vertical = 3.dp),
    )
}

/** Skeleton block: surfaceVariant with a 0.55 ↔ 1 opacity pulse. */
@Composable
fun Skeleton(modifier: Modifier = Modifier, radius: Dp = 12.dp) {
    val t = rememberInfiniteTransition(label = "skeleton")
    val a by t.animateFloat(0.55f, 1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "a")
    Box(modifier.alpha(a).clip(RoundedCornerShape(radius)).background(CzenTheme.colors.surfaceVariant))
}

@Composable
fun SkeletonCard(modifier: Modifier = Modifier) {
    SurfaceCard(modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Skeleton(Modifier.size(44.dp), radius = 22.dp)
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Skeleton(Modifier.width(140.dp).height(14.dp))
                    Skeleton(Modifier.width(90.dp).height(12.dp))
                }
            }
            Skeleton(Modifier.fillMaxWidth().height(14.dp))
            Skeleton(Modifier.fillMaxWidth(0.7f).height(14.dp))
        }
    }
}

/** RN `EmptyState`: 64 dp icon circle in primaryMuted + title + message + outline action. */
@Composable
fun EmptyState(
    icon: CzenIcon,
    title: String,
    modifier: Modifier = Modifier,
    message: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    actionVariant: ButtonVariant = ButtonVariant.Outline,
) {
    val c = CzenTheme.colors
    Column(
        modifier.fillMaxWidth().padding(vertical = 32.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.size(64.dp).clip(CircleShape).background(Brand.PrimaryMuted), contentAlignment = Alignment.Center) {
            Icon(icon, size = 28.dp, color = c.primary)
        }
        Text(title, style = CzenTheme.type.title, color = c.textPrimary, textAlign = TextAlign.Center)
        if (message != null) {
            Text(message, style = CzenTheme.type.body, color = c.textSecondary, textAlign = TextAlign.Center)
        }
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(4.dp))
            CzenButton(actionLabel, onAction, variant = actionVariant)
        }
    }
}

/** RN `SearchInput`: 44 dp, radius 14, search glyph + clear. */
@Composable
fun SearchInput(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
) {
    val c = CzenTheme.colors
    Row(
        modifier
            .height(44.dp)
            .clip(RoundedCornerShape(Radii.control))
            .background(c.surfaceElevated)
            .border(1.dp, c.border, RoundedCornerShape(Radii.control))
            .padding(horizontal = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(CzenIcon.Search, size = 18.dp, color = c.textMuted)
        Box(Modifier.weight(1f)) {
            if (value.isEmpty()) Text(placeholder, style = CzenTheme.type.body, color = c.textMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = CzenTheme.type.body.copy(color = c.textPrimary),
                cursorBrush = SolidColor(c.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                modifier = Modifier.fillMaxWidth().semantics { contentDescription = placeholder },
            )
        }
        if (value.isNotEmpty()) {
            Box(Modifier.size(32.dp).clip(CircleShape).clickable { onValueChange("") }, contentAlignment = Alignment.Center) {
                Icon(CzenIcon.CloseCircle, size = 18.dp, color = c.textMuted, contentDescription = stringResource(R.string.a11y_clear_search))
            }
        }
    }
}

/**
 * Labelled text field (RN `Input` / `GlassAuthInput`): label, placeholder, error, optional
 * secure entry with a show/hide toggle, read-only mode.
 */
@Composable
fun CzenTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    error: String? = null,
    secure: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    capitalization: KeyboardCapitalization = KeyboardCapitalization.None,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: (() -> Unit)? = null,
    readOnly: Boolean = false,
    singleLine: Boolean = true,
    auth: Boolean = false,
    leadingIcon: CzenIcon? = null,
) {
    val c = CzenTheme.colors
    var revealed by rememberSaveable { mutableStateOf(false) }
    val shape = RoundedCornerShape(if (auth) Radii.authField else Radii.input)
    val bg = when {
        auth -> c.authField
        readOnly -> c.surfaceVariant
        else -> c.surfaceElevated
    }
    val ring = when {
        error != null -> c.danger
        auth -> c.authFieldRing
        else -> c.inputBorder
    }
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = CzenTheme.type.label, color = c.textSecondary)
        Row(
            Modifier
                .fillMaxWidth()
                .height(if (singleLine) (if (auth) 54.dp else 50.dp) else 96.dp)
                .clip(shape)
                .background(bg)
                .border(1.dp, ring, shape)
                .padding(start = 14.dp, end = if (secure) 4.dp else 14.dp),
            verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top,
        ) {
            if (leadingIcon != null) {
                Icon(leadingIcon, size = 18.dp, color = c.textMuted)
                Spacer(Modifier.width(10.dp))
            }
            Box(Modifier.weight(1f).padding(vertical = if (singleLine) 0.dp else 12.dp)) {
                if (value.isEmpty() && placeholder != null) {
                    Text(placeholder, style = CzenTheme.type.body, color = c.textMuted, maxLines = 1)
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    readOnly = readOnly,
                    singleLine = singleLine,
                    textStyle = CzenTheme.type.body.copy(color = if (readOnly) c.textSecondary else c.textPrimary),
                    cursorBrush = SolidColor(c.primary),
                    visualTransformation = if (secure && !revealed) PasswordVisualTransformation() else VisualTransformation.None,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = if (secure) KeyboardType.Password else keyboardType,
                        capitalization = capitalization,
                        imeAction = imeAction,
                    ),
                    keyboardActions = KeyboardActions(onAny = { onImeAction?.invoke() }),
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = label },
                )
            }
            if (secure) {
                val desc = stringResource(if (revealed) R.string.a11y_hide_password else R.string.a11y_show_password)
                Box(
                    Modifier.size(44.dp).clip(CircleShape).clickable(role = Role.Button) { revealed = !revealed },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(if (revealed) CzenIcon.EyeOff else CzenIcon.Eye, size = 20.dp, color = c.textMuted, contentDescription = desc)
                }
            }
        }
        if (error != null) Text(error, style = CzenTheme.type.caption, color = c.danger)
    }
}

/** RN `ThemeToggle`: 64×34 gradient track with sun / moon art. */
@Composable
fun ThemeToggle(dark: Boolean, onToggle: () -> Unit, modifier: Modifier = Modifier) {
    val x by animateDpAsState(if (dark) 32.dp else 2.dp, spring(dampingRatio = 0.7f), label = "theme")
    val desc = stringResource(R.string.profile_dark_mode)
    Box(
        modifier
            .size(64.dp, 48.dp)
            .toggleable(dark, role = Role.Switch) { onToggle() }
            .semantics { contentDescription = desc },
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .size(64.dp, 34.dp)
                .clip(RoundedCornerShape(50))
                .background(Brush.linearGradient(listOf(Brand.Primary, Color(0xFFC084FC)))),
        ) {
            Box(
                Modifier.offset { IntOffset(x.roundToPx(), 2.dp.roundToPx()) }.size(30.dp).shadow(3.dp, CircleShape).clip(CircleShape).background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    painterResource(if (dark) R.drawable.ic_moon else R.drawable.ic_sun),
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

/** RN `Surface`: surfaceElevated, radius 24, md shadow (`flat` drops it). */
@Composable
fun SurfaceCard(
    modifier: Modifier = Modifier,
    radius: Dp = Radii.card,
    flat: Boolean = false,
    elevation: Dp = 8.dp,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val c = CzenTheme.colors
    val shape = RoundedCornerShape(radius)
    var m = modifier
    if (!flat) m = m.shadow(elevation, shape, ambientColor = c.shadow.copy(alpha = 0.3f), spotColor = c.shadow.copy(alpha = if (c.isDark) 0.5f else 0.16f))
    m = m.clip(shape).background(c.surfaceElevated)
    if (c.isDark) m = m.border(1.dp, c.border, shape)
    if (onClick != null) {
        val interaction = remember { MutableInteractionSource() }
        m = m.pressScale(interaction).clickable(interaction, androidx.compose.material3.ripple(), onClick = onClick)
    }
    Box(m) { content() }
}

/** RN `RouteLine`: 10 dp primary dot, 2 dp connector, 10 dp success square. */
@Composable
fun RouteLine(pickup: String, dropoff: String, modifier: Modifier = Modifier) {
    val c = CzenTheme.colors
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Column(Modifier.padding(top = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(c.primary))
            Box(Modifier.width(2.dp).height(34.dp).background(c.border.copy(alpha = 1f).takeIf { !c.isDark } ?: c.borderStrong))
            Box(Modifier.size(10.dp).clip(RoundedCornerShape(2.dp)).background(c.success))
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Column {
                Text(stringResource(R.string.route_pickup), style = CzenTheme.type.caption, color = c.textMuted)
                Text(pickup, style = CzenTheme.type.body, color = c.textPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Column {
                Text(stringResource(R.string.route_dropoff), style = CzenTheme.type.caption, color = c.textMuted)
                Text(dropoff, style = CzenTheme.type.body, color = c.textPrimary, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}

/** Letter avatar used on trip cards and the profile. */
@Composable
fun LetterAvatar(name: String, modifier: Modifier = Modifier, size: Dp = 44.dp, glossy: Boolean = false) {
    val letter = name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    val c = CzenTheme.colors
    Box(
        modifier
            .size(size)
            .clip(CircleShape)
            .background(
                if (glossy) {
                    Brush.linearGradient(listOf(Brand.Deep, Brand.PrimaryPress, Brand.GradientEnd))
                } else {
                    Brush.linearGradient(listOf(c.primaryContainer, c.primaryContainer))
                },
            )
            .then(
                if (glossy) {
                    Modifier.border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.6f), Color.Transparent)), CircleShape)
                } else {
                    Modifier
                },
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (glossy) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.5f)
                    .align(Alignment.TopCenter)
                    .background(Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.28f), Color.Transparent))),
            )
        }
        Text(
            letter,
            style = (if (size >= 64.dp) CzenTheme.type.display else CzenTheme.type.title),
            color = if (glossy) Color.White else c.onPrimaryContainer,
        )
    }
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = CzenTheme.type.label,
        color = CzenTheme.colors.textSecondary,
        modifier = modifier.padding(start = 4.dp, top = 8.dp, bottom = 4.dp),
    )
}

@Composable
fun Divider(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(CzenTheme.colors.divider))
}

@Composable
fun Dot(color: Color, modifier: Modifier = Modifier, size: Dp = 8.dp) {
    Box(modifier.size(size).clip(CircleShape).background(color))
}
