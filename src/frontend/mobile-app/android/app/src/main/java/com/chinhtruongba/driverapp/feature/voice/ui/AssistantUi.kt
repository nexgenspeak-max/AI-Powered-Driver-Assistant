package com.chinhtruongba.driverapp.feature.voice.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/** Centre Czen orb in the tab bar (AssistantTabButton). */
@Composable
fun AssistantOrb(onHome: Boolean, modifier: Modifier = Modifier) {
    CzenOrb(onHome = onHome, modifier = modifier)
}

/** Full-screen chat overlay (AssistantChatOverlay, zIndex 100). */
@Composable
fun AssistantChatOverlay(onClose: () -> Unit) {
    AssistantChatPanel(onClose = onClose)
}
