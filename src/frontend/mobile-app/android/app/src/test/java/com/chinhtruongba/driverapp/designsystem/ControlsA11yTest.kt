package com.chinhtruongba.driverapp.designsystem

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.ThemeToggle
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class ControlsA11yTest {
    @get:Rule
    val rule = createComposeRule()

    private fun hasRole(role: Role) = SemanticsMatcher.expectValue(SemanticsProperties.Role, role)
    private fun hasState(desc: String) = SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, desc)

    @Test
    fun `theme toggle announces the theme its sun or moon icon shows`() {
        var dark by mutableStateOf(true)
        rule.setContent { CzenTheme(dark = dark) { ThemeToggle(dark = dark, onToggle = { dark = !dark }) } }
        rule.onNodeWithContentDescription("Chế độ tối").assert(hasRole(Role.Switch)).assert(hasState("Giao diện tối"))
        dark = false
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Chế độ tối").assert(hasState("Giao diện sáng"))
    }

    @Test
    fun `primary button is exposed as a button`() {
        rule.setContent { CzenTheme(dark = true) { CzenButton(text = "Lưu", onClick = {}) } }
        rule.onNodeWithText("Lưu").assert(hasRole(Role.Button))
    }
}
