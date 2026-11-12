import XCTest

/// Main journey in demo mode (no network): landing → login → Chuyến → accept → Czen chat →
/// Thu nhập → Cá nhân → Cài đặt trợ lý.
final class DemoJourneyUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    @MainActor
    func testDemoJourney() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-demo", "-signedOut", "-uiTesting", "-theme", "dark"]
        app.launch()

        app.buttons["landing-login"].tapWhenReady()
        let phone = app.textFields["login-phone"]
        phone.tapWhenReady()
        phone.typeText("0901234567")
        let password = app.secureTextFields["login-password"]
        password.tapWhenReady()
        password.typeText("secret1")
        app.buttons["login-submit"].tapWhenReady()

        // Home map with the status pill.
        XCTAssertTrue(app.descendants(matching: .any)["status-pill"].firstMatch.waitForExistence(timeout: 10))

        // Chuyến → Chờ → accept the offer.
        app.tabBars.buttons.element(boundBy: 1).tapWhenReady()
        app.buttons["trips-segment-0"].tapWhenReady()
        let accept = app.buttons["accept-trip-offer-01"]
        accept.tapWhenReady()
        XCTAssertTrue(accept.waitForNonExistence(timeout: 10))
        app.buttons["trips-segment-1"].tapWhenReady()
        let advance = app.buttons["advance-trip-offer-01"]
        for _ in 0..<6 where !advance.exists { app.swipeUp() }
        if !advance.waitForExistence(timeout: 5) { print("HIERARCHY>>>", app.debugDescription) }
        XCTAssertTrue(advance.exists)

        // Czen orb → chat panel connects and the scripted agent speaks.
        app.buttons["czen-orb"].tapWhenReady()
        XCTAssertTrue(app.buttons["chat-close"].waitForExistence(timeout: 5))
        let listening = app.staticTexts["Đang nghe"]
        XCTAssertTrue(listening.waitForExistence(timeout: 10))
        app.buttons["chat-close"].tapWhenReady()

        // Thu nhập shows the total.
        app.tabBars.buttons.element(boundBy: 3).tapWhenReady()
        XCTAssertTrue(app.staticTexts["earnings-total"].waitForExistence(timeout: 10))

        // Cá nhân → Cài đặt trợ lý.
        app.tabBars.buttons.element(boundBy: 4).tapWhenReady()
        app.buttons["menu-assistant-settings"].tapWhenReady()
        XCTAssertTrue(app.switches["toggle-hands-free"].waitForExistence(timeout: 10))
    }
}

/// VoiceOver labels the review asked for (demo mode, Vietnamese copy).
final class AccessibilityLabelUITests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    @MainActor
    private func launch(_ args: [String]) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-demo", "-uiTesting", "-theme", "light"] + args
        app.launch()
        return app
    }

    @MainActor
    func testHomeAndChatLabels() throws {
        let app = launch([])
        XCTAssertTrue(app.buttons["Về vị trí của tôi"].waitForExistence(timeout: 10))
        let call = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Gọi ")).firstMatch
        XCTAssertTrue(call.waitForExistence(timeout: 10), "next-stop call button")
        XCTAssertGreaterThan(call.label.count, "Gọi ".count, "call label names the customer")

        let orb = app.buttons["czen-orb"]
        XCTAssertTrue(orb.waitForExistence(timeout: 5))
        XCTAssertEqual(orb.label, "Trợ lý AI, đang tắt. Nhấn để bắt đầu hội thoại.")
        orb.tap()
        XCTAssertTrue(app.buttons["Thu nhỏ hội thoại"].waitForExistence(timeout: 5))
        let mic = app.buttons["chat-mic"]
        XCTAssertTrue(mic.waitForExistence(timeout: 5))
        XCTAssertTrue(["Micro, chưa kết nối", "Tắt micro, giữ kết nối", "Bật micro"].contains(mic.label), mic.label)
        let voice = app.buttons["chat-voice"]
        XCTAssertTrue(voice.label.hasPrefix("Trợ lý AI"), voice.label)
        let input = app.textFields["chat-input"]
        input.tapWhenReady()
        input.typeText("Xin chào")
        XCTAssertTrue(app.buttons["Gửi tin nhắn"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testNavigationOfferAndBackLabels() throws {
        var app = launch(["-navigate"])
        XCTAssertTrue(app.buttons["Thoát chỉ đường"].waitForExistence(timeout: 15))
        app.terminate()

        app = launch(["-startTab", "trips", "-showOffer"])
        XCTAssertTrue(app.buttons["Để sau"].waitForExistence(timeout: 10))
        app.terminate()

        app = launch(["-startTab", "profile"])
        app.buttons["menu-assistant-settings"].tapWhenReady()
        XCTAssertTrue(app.navigationBars.buttons["Quay lại"].waitForExistence(timeout: 10), app.navigationBars.debugDescription)
    }
}

extension XCUIElement {
    func tapWhenReady(timeout: TimeInterval = 10, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(waitForExistence(timeout: timeout), "missing \(self)", file: file, line: line)
        tap()
    }
}
