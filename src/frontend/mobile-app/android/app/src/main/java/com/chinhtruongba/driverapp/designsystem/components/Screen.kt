package com.chinhtruongba.driverapp.designsystem.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.designsystem.glass.LocalHazeState
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

/** Height of the floating glass tab bar plus breathing room, so scroll content clears it. */
val LocalBottomBarPadding = androidx.compose.runtime.staticCompositionLocalOf { 0.dp }

/** RN `AppBar`: 56 dp, 40 dp round back chip, h2 title — drawn as a glass bar over content. */
@Composable
fun AppBar(
    title: String,
    onBack: (() -> Unit)?,
    modifier: Modifier = Modifier,
    trailing: @Composable (() -> Unit)? = null,
) {
    val c = CzenTheme.colors
    Box(
        modifier
            .fillMaxWidth()
            .glass(RoundedCornerShape(bottomStart = 22.dp, bottomEnd = 22.dp), elevation = 10.dp)
            .windowInsetsPadding(WindowInsets.statusBars),
    ) {
        Row(
            Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                IconCircleButton(
                    CzenIcon.ChevronLeft,
                    contentDescription = stringResource(R.string.a11y_back),
                    onClick = onBack,
                    size = 40.dp,
                    background = c.chip.copy(alpha = 0.7f),
                )
            } else {
                Spacer(Modifier.width(12.dp))
            }
            Text(
                title,
                style = if (onBack == null) CzenTheme.type.h1 else CzenTheme.type.h2,
                color = c.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f).padding(horizontal = 4.dp),
            )
            if (trailing != null) trailing() else Spacer(Modifier.width(48.dp))
        }
    }
}

/**
 * RN `Screen` shell for pushed screens: scrolling content under a glass [AppBar]. The content is
 * the blur source for the bar, so cards slide under frosted glass as they scroll.
 */
@Composable
fun Screen(
    title: String,
    onBack: (() -> Unit)?,
    modifier: Modifier = Modifier,
    scroll: Boolean = true,
    maxContentWidth: Dp = 640.dp,
    contentPadding: PaddingValues = PaddingValues(horizontal = 20.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = CzenTheme.colors
    val haze = rememberHazeState()
    val bottomPad = LocalBottomBarPadding.current
    Box(modifier.fillMaxSize().background(c.background)) {
        Column(
            Modifier
                .fillMaxSize()
                .hazeSource(haze)
                .then(if (scroll) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .imePadding()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(top = 56.dp + 16.dp, bottom = bottomPad + 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                Modifier.widthIn(max = maxContentWidth).fillMaxWidth().padding(contentPadding),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                content = content,
            )
        }
        CompositionLocalProvider(LocalHazeState provides haze) {
            AppBar(title, onBack)
        }
    }
}
