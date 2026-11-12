package com.chinhtruongba.driverapp.app

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.designsystem.glass.GlassKind
import com.chinhtruongba.driverapp.designsystem.glass.glass
import com.chinhtruongba.driverapp.designsystem.icons.CzenIcon
import com.chinhtruongba.driverapp.designsystem.icons.Icon
import com.chinhtruongba.driverapp.designsystem.theme.Brand
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme

/** Bar height (without the system navigation inset). */
val TAB_BAR_HEIGHT: Dp = 68.dp
const val TAB_BAR_SIDE_MARGIN = 14

private data class TabSpec(val tab: Tab, val label: Int, val icon: CzenIcon, val iconActive: CzenIcon)

private val TABS = listOf(
    TabSpec(Tab.Home, R.string.tab_home, CzenIcon.Home, CzenIcon.HomeFill),
    TabSpec(Tab.Trips, R.string.tab_trips, CzenIcon.Wheel, CzenIcon.WheelFill),
    TabSpec(Tab.Earnings, R.string.tab_earnings, CzenIcon.Purse, CzenIcon.PurseFill),
    TabSpec(Tab.Profile, R.string.tab_profile, CzenIcon.Person, CzenIcon.PersonFill),
)

/**
 * Floating Liquid-Glass tab bar: frosted capsule over the content (blurred via the shell's haze
 * source), four tabs with the Czen orb rising from the centre slot.
 */
@Composable
fun CzenTabBar(
    selected: Tab?,
    onSelect: (Tab) -> Unit,
    modifier: Modifier = Modifier,
    orb: @Composable () -> Unit,
) {
    Box(
        modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(start = TAB_BAR_SIDE_MARGIN.dp, end = TAB_BAR_SIDE_MARGIN.dp, bottom = 10.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Row(
            Modifier
                .widthIn(max = 560.dp)
                .fillMaxWidth()
                .height(TAB_BAR_HEIGHT)
                .glass(
                    RoundedCornerShape(34.dp),
                    kind = GlassKind.Frosted,
                    elevation = 22.dp,
                    // Denser than the generic tint so labels stay legible over the light map tiles.
                    tint = if (CzenTheme.colors.isDark) Color(0xB8261C30) else Color(0xB8FFFFFF),
                )
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // slots = routes + 1, AI slot index = floor(n/2)
            TABS.take(2).forEach { TabItem(it, selected == it.tab, onSelect, Modifier.weight(1f)) }
            // AI slot: the orb floats above; its label sits on the tab-label baseline.
            Box(Modifier.weight(1f).fillMaxHeight().padding(bottom = 10.dp), contentAlignment = Alignment.BottomCenter) {
                Text(stringResource(R.string.tab_assistant), style = CzenTheme.type.tab, color = CzenTheme.colors.textSecondary, maxLines = 1)
            }
            TABS.drop(2).forEach { TabItem(it, selected == it.tab, onSelect, Modifier.weight(1f)) }
        }
        Box(Modifier.align(Alignment.BottomCenter).offset(y = (-(TAB_BAR_HEIGHT - 64.dp) / 2) - 26.dp)) {
            orb()
        }
    }
}

@Composable
private fun TabItem(spec: TabSpec, active: Boolean, onSelect: (Tab) -> Unit, modifier: Modifier) {
    val c = CzenTheme.colors
    val scaleX by animateFloatAsState(if (active) 1f else 0.6f, tween(180), label = "ind")
    val alpha by animateFloatAsState(if (active) 1f else 0f, tween(180), label = "indA")
    val color = if (active) c.primary else c.textSecondary
    Column(
        modifier
            .fillMaxHeight()
            .clip(RoundedCornerShape(24.dp))
            .clickable(remember { MutableInteractionSource() }, null, role = Role.Tab) { onSelect(spec.tab) }
            .semantics { this.selected = active },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(56.dp, 30.dp)
                    .graphicsLayer {
                        this.scaleX = scaleX
                        this.alpha = alpha
                    }
                    .clip(RoundedCornerShape(50))
                    .background(Brand.PrimaryMuted),
            )
            Icon(if (active) spec.iconActive else spec.icon, size = 24.dp, color = color, active = active)
        }
        Spacer(Modifier.height(3.dp))
        Text(
            stringResource(spec.label),
            style = CzenTheme.type.tab.copy(fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium),
            color = color,
            maxLines = 1,
        )
        Spacer(Modifier.width(0.dp))
    }
}
