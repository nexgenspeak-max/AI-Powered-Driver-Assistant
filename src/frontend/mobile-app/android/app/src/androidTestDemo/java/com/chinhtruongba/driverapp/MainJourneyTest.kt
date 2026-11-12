package com.chinhtruongba.driverapp

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onLast
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Main journey on the demo flavor (bundled fake backend, no network):
 * landing → login → Home → Chuyến (segments) → Thu nhập → Cá nhân → Cài đặt trợ lý → assistant chat.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class MainJourneyTest {
    @get:Rule
    val rule = createAndroidComposeRule<MainActivity>()

    private fun grant(vararg perms: String) {
        val ui = InstrumentationRegistry.getInstrumentation().uiAutomation
        val pkg = InstrumentationRegistry.getInstrumentation().targetContext.packageName
        perms.forEach { runCatching { ui.grantRuntimePermission(pkg, it) } }
    }

    @Test
    fun loginAndVisitEveryTab() {
        grant(android.Manifest.permission.RECORD_AUDIO, android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.POST_NOTIFICATIONS)

        // Start signed out if a previous run left a session behind.
        rule.waitUntil(10_000) {
            rule.onAllNodesWithText("Trợ lý giọng nói cho tài xế").fetchSemanticsNodes().isNotEmpty() ||
                rule.onAllNodesWithText("Trang chủ").fetchSemanticsNodes().isNotEmpty()
        }
        if (rule.onAllNodesWithText("Trợ lý giọng nói cho tài xế").fetchSemanticsNodes().isEmpty()) {
            rule.onNodeWithText("Cá nhân").performClick()
            rule.waitUntilAtLeastOneExists(hasText("Đăng xuất"), 10_000)
            rule.onNodeWithText("Đăng xuất").performScrollTo().performClick()
            rule.waitUntil(5_000) { rule.onAllNodesWithText("Đăng xuất").fetchSemanticsNodes().size == 2 }
            rule.onAllNodesWithText("Đăng xuất").onLast().performClick()
            rule.waitUntilAtLeastOneExists(hasText("Trợ lý giọng nói cho tài xế"), 10_000)
        }

        // Landing → Login; validation errors first.
        rule.onNodeWithText("Đăng nhập").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Chào mừng trở lại. Đăng nhập để bắt đầu nhận chuyến."), 5_000)
        rule.onAllNodesWithText("Đăng nhập")[1].performClick()
        rule.onNodeWithText("Số điện thoại chưa hợp lệ").assertExists()
        rule.onNodeWithText("Mật khẩu tối thiểu 6 ký tự").assertExists()
        rule.onNodeWithContentDescription("Số điện thoại").performTextInput("0901234567")
        rule.onNodeWithContentDescription("Mật khẩu").performTextInput("secret1")
        rule.onAllNodesWithText("Đăng nhập")[1].performClick()

        // Home: tab bar + next stop card from the bundled context.
        rule.waitUntilAtLeastOneExists(hasText("Trang chủ"), 10_000)
        rule.waitUntilAtLeastOneExists(hasText("Nguyễn Thu Hà"), 10_000)

        // Chuyến: default segment "Đang chạy", then Chờ and Xong.
        rule.onNodeWithText("Chuyến").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Lộ trình tối ưu"), 10_000)
        rule.onNodeWithText("Chờ (2)").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Phạm Minh Anh"), 5_000)
        rule.onNodeWithText("Xong (8)").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Đặng Mỹ Linh"), 5_000)

        // Thu nhập: hero + 7-day chart.
        rule.onNodeWithText("Thu nhập").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Tổng thu nhập"), 10_000)
        rule.onNodeWithText("7 ngày qua").assertExists()

        // Cá nhân → Cài đặt trợ lý.
        rule.onNodeWithText("Cá nhân").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Thống kê"), 10_000)
        rule.onNodeWithText("Cài đặt trợ lý").performScrollTo().performClick()
        rule.waitUntilAtLeastOneExists(hasText("Chế độ rảnh tay"), 10_000)
        rule.onNodeWithContentDescription("Quay lại").performClick()
        rule.waitUntilAtLeastOneExists(hasText("Thống kê"), 10_000)

        // Orb → chat panel connects to the scripted demo agent.
        rule.onNode(hasContentDescription("Trợ lý AI", substring = true)).performClick()
        rule.waitUntilAtLeastOneExists(hasText("Đang nghe"), 15_000)
        rule.waitUntilAtLeastOneExists(hasText("Em là Czen", substring = true), 15_000)
        rule.onNodeWithContentDescription("Thu nhỏ hội thoại").performClick()
    }
}
