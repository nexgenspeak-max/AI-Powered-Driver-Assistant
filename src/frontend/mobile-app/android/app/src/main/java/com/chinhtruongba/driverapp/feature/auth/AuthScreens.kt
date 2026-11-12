package com.chinhtruongba.driverapp.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.designsystem.components.ButtonVariant
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.CzenTextField
import com.chinhtruongba.driverapp.designsystem.components.GlassButton
import com.chinhtruongba.driverapp.designsystem.components.IconCircleButton
import com.chinhtruongba.driverapp.designsystem.components.ThemeToggle
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.CzenMark
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import com.chinhtruongba.driverapp.designsystem.theme.Radii

/** AuthScreenBackground: violet vertical gradient + a soft brand bloom. */
@Composable
fun AuthBackground(content: @Composable BoxScope.() -> Unit) {
    val c = CzenTheme.colors
    Box(
        Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(c.authGradient)),
    ) {
        // Soft brand bloom near the top (radial gradient — a blur would clip to its bounds).
        val bloom = Brand.PrimaryPress.copy(alpha = if (c.isDark) 0.34f else 0.18f)
        Box(
            Modifier.fillMaxSize().drawBehind {
                drawRect(
                    Brush.radialGradient(
                        listOf(bloom, Color.Transparent),
                        center = androidx.compose.ui.geometry.Offset(size.width / 2, size.height * 0.28f),
                        radius = size.width * 0.75f,
                    ),
                )
            },
        )
        content()
    }
}

/** BrandHero: the app icon tile with gradient, gloss and a #7C3AED halo. */
@Composable
fun BrandHero(tile: Dp = 132.dp) {
    val c = CzenTheme.colors
    Box(Modifier.size(tile + 80.dp), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .size(tile + 80.dp)
                .alpha(if (c.isDark) 0.22f else 0.12f)
                .clip(CircleShape)
                .background(Brand.PrimaryPress),
        )
        BrandTile(tile)
    }
}

@Composable
fun BrandTile(tile: Dp) {
    val shape = RoundedCornerShape(tile * 0.28f)
    Box(
        Modifier
            .size(tile)
            .shadow(tile * 0.18f, shape, ambientColor = Brand.Deep, spotColor = Brand.Deep)
            .clip(shape)
            .background(Brush.linearGradient(listOf(Brand.Deep, Brand.PrimaryPress, Brand.GradientEnd)))
            .border(1.dp, Brush.verticalGradient(listOf(Color.White.copy(alpha = 0.45f), Color.Transparent)), shape),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Brush.linearGradient(0f to Color.White.copy(alpha = 0.28f), 0.6f to Color.Transparent)),
        )
        CzenMark(size = tile * 0.72f)
    }
}

@Composable
fun LandingScreen(onLogin: () -> Unit, onRegister: () -> Unit, themeVm: ThemeViewModel = hiltViewModel()) {
    val c = CzenTheme.colors
    val dark by themeVm.dark.collectAsStateWithLifecycle()
    AuthBackground {
        Column(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(horizontal = 20.dp, vertical = 16.dp)
                .align(Alignment.Center)
                .widthIn(max = 384.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(Modifier.fillMaxWidth().height(48.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                ThemeToggle(dark = dark, onToggle = themeVm::toggle)
            }
            Column(
                Modifier.weight(1f).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterVertically),
            ) {
                BrandHero()
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.landing_brand), style = CzenTheme.type.display.copy(fontSize = CzenTheme.type.display.fontSize * 1.25f), color = c.authTitle)
                    Text(stringResource(R.string.landing_tagline), style = CzenTheme.type.h2, color = c.primary, textAlign = TextAlign.Center)
                    Text(
                        stringResource(R.string.landing_body),
                        style = CzenTheme.type.body,
                        color = c.textSecondary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp),
                    )
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                GlassButton(stringResource(R.string.auth_login), onLogin, Modifier.fillMaxWidth())
                CzenButton(stringResource(R.string.auth_register), onRegister, Modifier.fillMaxWidth(), variant = ButtonVariant.Outline)
            }
        }
    }
}

/** AuthHeader: 44 dp back button, 56 dp brand tile, title + subtitle. */
@Composable
private fun AuthHeader(title: String, subtitle: String, onBack: () -> Unit) {
    val c = CzenTheme.colors
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        IconCircleButton(
            CzenIcon.ChevronLeft,
            stringResource(R.string.a11y_back),
            onBack,
            size = 44.dp,
            background = c.authField,
        )
        BrandTile(56.dp)
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(title, style = CzenTheme.type.display, color = c.authTitle)
            Text(subtitle, style = CzenTheme.type.body, color = c.textSecondary)
        }
    }
}

@Composable
private fun AuthScaffold(content: @Composable () -> Unit) {
    AuthBackground {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .imePadding()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(Modifier.widthIn(max = 384.dp).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(20.dp)) { content() }
        }
    }
}

@Composable
private fun AuthLink(prefix: String, link: String, onClick: () -> Unit) {
    val c = CzenTheme.colors
    Text(
        buildAnnotatedString {
            append(prefix)
            append(" ")
            withStyle(SpanStyle(color = Brand.Primary, fontWeight = FontWeight.SemiBold)) { append(link) }
        },
        style = CzenTheme.type.body,
        color = c.textSecondary,
        textAlign = TextAlign.Center,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = 12.dp),
    )
}

@Composable
fun LoginScreen(onBack: () -> Unit, onRegister: () -> Unit, vm: LoginViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    AuthScaffold {
        AuthHeader(stringResource(R.string.auth_login), stringResource(R.string.login_subtitle), onBack)
        CzenTextField(
            s.phone, vm::onPhone, stringResource(R.string.field_phone),
            placeholder = stringResource(R.string.field_phone_placeholder),
            error = s.phoneError?.let { stringResource(it) },
            keyboardType = KeyboardType.Phone, auth = true, leadingIcon = CzenIcon.Phone,
        )
        CzenTextField(
            s.password, vm::onPassword, stringResource(R.string.field_password),
            error = s.passwordError?.let { stringResource(it) },
            secure = true, imeAction = ImeAction.Done, onImeAction = vm::submit, auth = true,
        )
        if (s.failed) Text(stringResource(R.string.login_failed), style = CzenTheme.type.label, color = c.danger)
        GlassButton(stringResource(R.string.auth_login), vm::submit, Modifier.fillMaxWidth(), loading = s.submitting)
        AuthLink(stringResource(R.string.login_no_account), stringResource(R.string.login_register_link), onRegister)
    }
}

@Composable
fun VehicleTypeSelect(value: String?, onChange: (String) -> Unit, error: String?, auth: Boolean = true) {
    val c = CzenTheme.colors
    var open by remember { mutableStateOf(false) }
    val label = VEHICLE_TYPES.firstOrNull { it.first == value }?.second?.let { stringResource(it) }
    val fieldLabel = stringResource(R.string.field_vehicle_type)
    val shape = RoundedCornerShape(if (auth) Radii.authField else Radii.input)
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(fieldLabel, style = CzenTheme.type.label, color = c.textSecondary)
        Box {
            Row(
                Modifier
                    .fillMaxWidth()
                    .height(if (auth) 54.dp else 50.dp)
                    .clip(shape)
                    .background(if (auth) c.authField else c.surfaceElevated)
                    .border(1.dp, if (error != null) c.danger else if (auth) c.authFieldRing else c.inputBorder, shape)
                    .clickable(role = Role.DropdownList) { open = true }
                    .semantics { contentDescription = fieldLabel }
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(CzenIcon.Car, size = 18.dp, color = c.textMuted)
                Spacer(Modifier.size(10.dp))
                Text(
                    label ?: stringResource(R.string.field_vehicle_type_placeholder),
                    style = CzenTheme.type.body,
                    color = if (label == null) c.textMuted else c.textPrimary,
                    modifier = Modifier.weight(1f),
                )
                Icon(CzenIcon.ChevronDown, size = 18.dp, color = c.textMuted)
            }
            DropdownMenu(open, onDismissRequest = { open = false }, shape = RoundedCornerShape(16.dp), containerColor = c.surfaceElevated) {
                VEHICLE_TYPES.forEach { (key, res) ->
                    DropdownMenuItem(
                        text = { Text(stringResource(res), style = CzenTheme.type.body, color = c.textPrimary) },
                        trailingIcon = { if (key == value) Icon(CzenIcon.Check, size = 18.dp, color = c.primary) },
                        onClick = {
                            onChange(key)
                            open = false
                        },
                    )
                }
            }
        }
        if (error != null) Text(error, style = CzenTheme.type.caption, color = c.danger)
    }
}

@Composable
fun RegisterScreen(onBack: () -> Unit, onLogin: () -> Unit, vm: RegisterViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    fun err(k: String) = s.errors[k]
    AuthScaffold {
        AuthHeader(stringResource(R.string.register_title), stringResource(R.string.register_subtitle), onBack)
        CzenTextField(
            s.name, { vm.update("name", it) }, stringResource(R.string.field_name),
            placeholder = stringResource(R.string.field_name_placeholder), error = err("name")?.let { stringResource(it) },
            capitalization = KeyboardCapitalization.Words, auth = true,
        )
        CzenTextField(
            s.phone, { vm.update("phone", it) }, stringResource(R.string.field_phone),
            placeholder = stringResource(R.string.field_phone_placeholder), error = err("phone")?.let { stringResource(it) },
            keyboardType = KeyboardType.Phone, auth = true,
        )
        CzenTextField(
            s.email, { vm.update("email", it) }, stringResource(R.string.field_email),
            placeholder = stringResource(R.string.field_email_placeholder), error = err("email")?.let { stringResource(it) },
            keyboardType = KeyboardType.Email, auth = true,
        )
        CzenTextField(
            s.password, { vm.update("password", it) }, stringResource(R.string.field_password),
            error = err("password")?.let { stringResource(it) }, secure = true, auth = true,
        )
        VehicleTypeSelect(s.vehicleType, { vm.update("vehicleType", it) }, err("vehicleType")?.let { stringResource(it) })
        CzenTextField(
            s.plate, { vm.update("plate", it) }, stringResource(R.string.field_plate),
            placeholder = stringResource(R.string.field_plate_placeholder), error = err("plate")?.let { stringResource(it) },
            capitalization = KeyboardCapitalization.Characters, auth = true,
        )
        CzenTextField(
            s.vehicleName, { vm.update("vehicleName", it) }, stringResource(R.string.field_vehicle_name),
            placeholder = stringResource(R.string.field_vehicle_name_placeholder), error = err("vehicleName")?.let { stringResource(it) },
            imeAction = ImeAction.Done, onImeAction = vm::submit, auth = true,
        )
        if (s.failed) Text(stringResource(R.string.register_failed), style = CzenTheme.type.label, color = c.danger)
        GlassButton(stringResource(R.string.auth_register), vm::submit, Modifier.fillMaxWidth(), loading = s.submitting)
        if (s.submitting) {
            CzenButton(stringResource(R.string.common_cancel), vm::cancel, Modifier.fillMaxWidth(), variant = ButtonVariant.Outline)
        }
        AuthLink(stringResource(R.string.register_have_account), stringResource(R.string.register_login_link), onLogin)
    }
}
