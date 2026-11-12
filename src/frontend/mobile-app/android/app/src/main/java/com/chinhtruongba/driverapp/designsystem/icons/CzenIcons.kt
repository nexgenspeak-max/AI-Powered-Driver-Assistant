// GENERATED from driver-app/src/components/icons/glyphs.ts — do not edit by hand.
package com.chinhtruongba.driverapp.designsystem.icons

internal sealed interface GlyphPart {
    val body: Boolean
}

internal data class PathPart(
    val d: String,
    override val body: Boolean = false,
    val solid: Boolean = false,
    val evenOdd: Boolean = false,
) : GlyphPart

internal data class CirclePart(
    val cx: Float,
    val cy: Float,
    val r: Float,
    override val body: Boolean = false,
    val dot: Boolean = false,
) : GlyphPart

enum class CzenIcon(internal val parts: List<GlyphPart>) {
    Home(
        listOf(
            PathPart("M3.8 10.4 11.1 4.3a1.4 1.4 0 0 1 1.8 0l7.3 6.1a1.5 1.5 0 0 1 .5 1.1v7.6a1.9 1.9 0 0 1-1.9 1.9h-3.3a.9.9 0 0 1-.9-.9v-4.4a1.1 1.1 0 0 0-1.1-1.1h-3a1.1 1.1 0 0 0-1.1 1.1v4.4a.9.9 0 0 1-.9.9H5.2a1.9 1.9 0 0 1-1.9-1.9v-7.6a1.5 1.5 0 0 1 .5-1.1Z"),
        ),
    ),
    HomeFill(
        listOf(
            PathPart("M3.8 10.4 11.1 4.3a1.4 1.4 0 0 1 1.8 0l7.3 6.1a1.5 1.5 0 0 1 .5 1.1v7.6a1.9 1.9 0 0 1-1.9 1.9h-3.3a.9.9 0 0 1-.9-.9v-4.4a1.1 1.1 0 0 0-1.1-1.1h-3a1.1 1.1 0 0 0-1.1 1.1v4.4a.9.9 0 0 1-.9.9H5.2a1.9 1.9 0 0 1-1.9-1.9v-7.6a1.5 1.5 0 0 1 .5-1.1Z", solid = true),
        ),
    ),
    Wheel(
        listOf(
            CirclePart(12.0f, 12.0f, 8.6f),
            CirclePart(12.0f, 12.0f, 2.5f),
            PathPart("M3.5 12h6"),
            PathPart("M14.5 12h6"),
            PathPart("M12 14.5v6"),
        ),
    ),
    WheelFill(
        listOf(
            PathPart("M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm0 2.4a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4Z", solid = true, evenOdd = true),
            CirclePart(12.0f, 12.0f, 3.3f, dot = true),
            PathPart("M3.6 10.7h6.2v2.6H3.6Z", solid = true),
            PathPart("M14.2 10.7h6.2v2.6h-6.2Z", solid = true),
            PathPart("M10.7 14.2h2.6v6.2h-2.6Z", solid = true),
        ),
    ),
    Purse(
        listOf(
            PathPart("M6.2 6.6h12.3a2 2 0 0 1 2 2v9.4a2.4 2.4 0 0 1-2.4 2.4H6a2.5 2.5 0 0 1-2.5-2.5V8.4"),
            PathPart("M3.5 8.4a1.9 1.9 0 0 1 1.9-1.9L15.1 4a1.3 1.3 0 0 1 1.6 1.3v1.3"),
            PathPart("M20.5 11h-3.6a2.3 2.3 0 0 0 0 4.6h3.6"),
            CirclePart(17.0f, 13.3f, 0.9f, dot = true),
        ),
    ),
    PurseFill(
        listOf(
            PathPart("M5.1 6.1 15 3.5a1.8 1.8 0 0 1 2.2 1.7V6H5.4l-.3.1Z", solid = true),
            PathPart("M3.2 8.5A2.1 2.1 0 0 1 5.3 6.6h13.2a2.2 2.2 0 0 1 2.2 2.2v1.6h-3.8a2.9 2.9 0 0 0 0 5.8h3.8v1.8a2.6 2.6 0 0 1-2.6 2.6H5.9a2.7 2.7 0 0 1-2.7-2.7V8.5Zm13.8 3.7a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z", solid = true, evenOdd = true),
            PathPart("M20.7 11.6v3.4h-3.8a1.7 1.7 0 0 1 0-3.4h3.8Z", solid = true),
        ),
    ),
    Person(
        listOf(
            CirclePart(12.0f, 7.9f, 3.7f),
            PathPart("M4.9 19.1c.5-3.2 3.4-5.4 7.1-5.4s6.6 2.2 7.1 5.4a1.2 1.2 0 0 1-1.2 1.4H6.1a1.2 1.2 0 0 1-1.2-1.4Z"),
        ),
    ),
    PersonFill(
        listOf(
            CirclePart(12.0f, 7.9f, 4.0f, dot = true),
            PathPart("M4.6 19c.5-3.4 3.5-5.8 7.4-5.8s6.9 2.4 7.4 5.8a1.4 1.4 0 0 1-1.4 1.6H6a1.4 1.4 0 0 1-1.4-1.6Z", solid = true),
        ),
    ),
    Map(
        listOf(
            PathPart("M9 4.5 3.5 6.6v13l5.5-2.1 6 2.1 5.5-2.1v-13L15 6.6 9 4.5Z", body = true),
            PathPart("M9 4.5v13"),
            PathPart("M15 6.6v13"),
        ),
    ),
    Car(
        listOf(
            PathPart("M4.5 11.2h15a1.5 1.5 0 0 1 1.5 1.5v3.6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.3v-3.6a1.5 1.5 0 0 1 1.5-1.5Z", body = true),
            PathPart("m5.2 11.2 1.5-4.1a2 2 0 0 1 1.9-1.3h6.8a2 2 0 0 1 1.9 1.3l1.5 4.1"),
            PathPart("M6.5 17.8v1.7"),
            PathPart("M17.5 17.8v1.7"),
            CirclePart(7.2f, 14.5f, 1.05f, dot = true),
            CirclePart(16.8f, 14.5f, 1.05f, dot = true),
        ),
    ),
    Wallet(
        listOf(
            PathPart("M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 5.5", body = true),
            PathPart("M4 7.5V5.5A1.5 1.5 0 0 1 5.5 4h10.8a.7.7 0 0 1 .7.7V8"),
            CirclePart(16.3f, 13.5f, 1.15f, dot = true),
        ),
    ),
    Profile(
        listOf(
            CirclePart(12.0f, 8.3f, 3.6f, body = true),
            PathPart("M5 19.6c.9-3.4 3.7-5.6 7-5.6s6.1 2.2 7 5.6a.6.6 0 0 1-.6.8H5.6a.6.6 0 0 1-.6-.8Z", body = true),
        ),
    ),
    ChevronLeft(
        listOf(
            PathPart("m14.5 5.8-6.2 6.2 6.2 6.2"),
        ),
    ),
    ChevronRight(
        listOf(
            PathPart("m9.5 5.8 6.2 6.2-6.2 6.2"),
        ),
    ),
    ChevronDown(
        listOf(
            PathPart("m5.8 9.5 6.2 6.2 6.2-6.2"),
        ),
    ),
    ChevronUp(
        listOf(
            PathPart("m5.8 14.5 6.2-6.2 6.2 6.2"),
        ),
    ),
    ArrowLeft(
        listOf(
            PathPart("M19 12H5.5"),
            PathPart("m11 6-6 6 6 6"),
        ),
    ),
    Close(
        listOf(
            PathPart("m6.5 6.5 11 11"),
            PathPart("m17.5 6.5-11 11"),
        ),
    ),
    CloseCircle(
        listOf(
            CirclePart(12.0f, 12.0f, 9.0f, body = true),
            PathPart("m9.3 9.3 5.4 5.4"),
            PathPart("m14.7 9.3-5.4 5.4"),
        ),
    ),
    Plus(
        listOf(
            PathPart("M12 5.5v13"),
            PathPart("M5.5 12h13"),
        ),
    ),
    Check(
        listOf(
            PathPart("m5 12.6 4.5 4.4L19 7.4"),
        ),
    ),
    CheckCircle(
        listOf(
            CirclePart(12.0f, 12.0f, 9.0f, body = true),
            PathPart("m8.2 12.3 2.6 2.6 5-5.3"),
        ),
    ),
    Search(
        listOf(
            CirclePart(10.8f, 10.8f, 6.3f, body = true),
            PathPart("m15.5 15.5 4 4"),
        ),
    ),
    Send(
        listOf(
            PathPart("M4.3 10.9 19 4.5a.6.6 0 0 1 .8.8l-6.4 14.6a.6.6 0 0 1-1.1-.1l-1.7-6.1-6.2-1.7a.6.6 0 0 1-.1-1.1Z", body = true),
            PathPart("m10.6 13.7 4.2-4.2"),
        ),
    ),
    Eye(
        listOf(
            PathPart("M2.8 12C4.7 8 8 5.8 12 5.8s7.3 2.2 9.2 6.2c-1.9 4-5.2 6.2-9.2 6.2S4.7 16 2.8 12Z", body = true),
            CirclePart(12.0f, 12.0f, 2.8f),
        ),
    ),
    EyeOff(
        listOf(
            PathPart("M9.9 6a9 9 0 0 1 2.1-.2c4 0 7.3 2.2 9.2 6.2a12 12 0 0 1-2.4 3.4M6.4 7.4A11.6 11.6 0 0 0 2.8 12c1.9 4 5.2 6.2 9.2 6.2 1.7 0 3.2-.4 4.6-1.2"),
            PathPart("M10 10a2.8 2.8 0 0 0 4 4"),
            PathPart("m4 4 16 16"),
        ),
    ),
    Refresh(
        listOf(
            PathPart("M19.5 12a7.5 7.5 0 1 1-2.2-5.3"),
            PathPart("M19.6 4.6v4.1h-4.1"),
        ),
    ),
    Locate(
        listOf(
            CirclePart(12.0f, 12.0f, 6.5f, body = true),
            CirclePart(12.0f, 12.0f, 2.2f, dot = true),
            PathPart("M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7"),
        ),
    ),
    Navigate(
        listOf(
            PathPart("M12 3.5 19 20l-7-3.9L5 20l7-16.5Z", body = true),
        ),
    ),
    Pin(
        listOf(
            PathPart("M12 21.2s-6.6-5.7-6.6-11.2a6.6 6.6 0 0 1 13.2 0c0 5.5-6.6 11.2-6.6 11.2Z", body = true),
            CirclePart(12.0f, 10.0f, 2.4f),
        ),
    ),
    Flag(
        listOf(
            PathPart("M5.5 21V4.2"),
            PathPart("M5.5 4.5h11.3a.5.5 0 0 1 .4.8l-2.4 3.7 2.4 3.7a.5.5 0 0 1-.4.8H5.5", body = true),
        ),
    ),
    Distance(
        listOf(
            CirclePart(6.0f, 18.0f, 2.2f, body = true),
            CirclePart(18.0f, 6.0f, 2.2f, body = true),
            PathPart("M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"),
        ),
    ),
    Route(
        listOf(
            CirclePart(6.0f, 19.0f, 1.9f, dot = true),
            CirclePart(18.0f, 5.0f, 1.9f, body = true),
            PathPart("M6 16.9V9.3a3.3 3.3 0 0 1 6.6 0v5.4a3.3 3.3 0 0 0 6.6 0V7.4"),
        ),
    ),
    Clock(
        listOf(
            CirclePart(12.0f, 12.0f, 8.6f, body = true),
            PathPart("M12 7.6V12l2.9 1.9"),
        ),
    ),
    Calendar(
        listOf(
            PathPart("M5.2 6.2h13.6a1.7 1.7 0 0 1 1.7 1.7v10.9a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.9a1.7 1.7 0 0 1 1.7-1.7Z", body = true),
            PathPart("M3.5 10.4h17"),
            PathPart("M8 3.8v4"),
            PathPart("M16 3.8v4"),
        ),
    ),
    Phone(
        listOf(
            PathPart("M8.4 3.8 6.3 4A1.9 1.9 0 0 0 4.6 6c.4 7.3 6.1 13 13.4 13.4a1.9 1.9 0 0 0 2-1.7l.2-2.1a1 1 0 0 0-.7-1.1l-3.2-1a1 1 0 0 0-1.1.4l-1.1 1.6a12.2 12.2 0 0 1-4.6-4.6L11 9.8a1 1 0 0 0 .4-1.1l-1-3.2a1 1 0 0 0-1-.7Z", body = true),
        ),
    ),
    Customer(
        listOf(
            CirclePart(12.0f, 12.0f, 9.0f, body = true),
            CirclePart(12.0f, 10.0f, 3.0f),
            PathPart("M6.6 18.3c1.2-2 3.1-3.2 5.4-3.2s4.2 1.2 5.4 3.2"),
        ),
    ),
    TurnLeft(
        listOf(
            PathPart("M17 20.5v-8a3.5 3.5 0 0 0-3.5-3.5H6"),
            PathPart("M9.6 5.4 6 9l3.6 3.6"),
        ),
    ),
    TurnRight(
        listOf(
            PathPart("M7 20.5v-8A3.5 3.5 0 0 1 10.5 9H18"),
            PathPart("M14.4 5.4 18 9l-3.6 3.6"),
        ),
    ),
    Straight(
        listOf(
            PathPart("M12 20.5V5"),
            PathPart("M6.6 10.4 12 5l5.4 5.4"),
        ),
    ),
    Uturn(
        listOf(
            PathPart("M7.5 20.5V10a4.25 4.25 0 0 1 8.5 0v6.5"),
            PathPart("m12.7 13.3 3.3 3.3 3.3-3.3"),
        ),
    ),
    Roundabout(
        listOf(
            PathPart("M12 21v-6.6"),
            PathPart("M9.2 13.4a4.6 4.6 0 1 1 5.6 0"),
            PathPart("M14.6 10.4v3.2h3.2"),
        ),
    ),
    Merge(
        listOf(
            PathPart("M7 3.8v4.6a4 4 0 0 0 1.2 2.8L12 15v5.5"),
            PathPart("M17 3.8v4.6a4 4 0 0 1-1.2 2.8l-2.2 2.2"),
        ),
    ),
    Warning(
        listOf(
            PathPart("M10.3 4.4a2 2 0 0 1 3.4 0l7.3 12.8a2 2 0 0 1-1.7 3H4.7a2 2 0 0 1-1.7-3l7.3-12.8Z", body = true),
            PathPart("M12 9.6v3.9"),
            CirclePart(12.0f, 16.7f, 1.05f, dot = true),
        ),
    ),
    AlertCircle(
        listOf(
            CirclePart(12.0f, 12.0f, 9.0f, body = true),
            PathPart("M12 7.6v5.2"),
            CirclePart(12.0f, 16.2f, 1.05f, dot = true),
        ),
    ),
    Info(
        listOf(
            CirclePart(12.0f, 12.0f, 9.0f, body = true),
            PathPart("M12 11.2v5.2"),
            CirclePart(12.0f, 7.9f, 1.05f, dot = true),
        ),
    ),
    Help(
        listOf(
            CirclePart(12.0f, 12.0f, 9.0f, body = true),
            PathPart("M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"),
            CirclePart(12.0f, 16.9f, 1.05f, dot = true),
        ),
    ),
    Star(
        listOf(
            PathPart("m12 3.9 2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8L12 3.9Z", body = true),
        ),
    ),
    Chart(
        listOf(
            PathPart("M6.5 11h1a1 1 0 0 1 1 1v6.5h-3V12a1 1 0 0 1 1-1Z", body = true),
            PathPart("M11.5 5.5h1a1 1 0 0 1 1 1v12h-3v-12a1 1 0 0 1 1-1Z", body = true),
            PathPart("M16.5 8.5h1a1 1 0 0 1 1 1v9h-3v-9a1 1 0 0 1 1-1Z", body = true),
            PathPart("M4 18.5h16"),
        ),
    ),
    ThumbsUp(
        listOf(
            PathPart("M4.6 10.4h2.9v9.1H4.6a1 1 0 0 1-1-1v-7.1a1 1 0 0 1 1-1Z", body = true),
            PathPart("m7.5 10.4 3.3-6.1a1.6 1.6 0 0 1 3 1l-.6 3.8h4.6a2 2 0 0 1 2 2.3l-1.1 6.4a2 2 0 0 1-2 1.7H7.5"),
        ),
    ),
    Edit(
        listOf(
            PathPart("m4.6 19.4.8-3.8L15.7 5.3a2.1 2.1 0 0 1 3 3L8.4 18.6l-3.8.8Z", body = true),
            PathPart("m13.9 7.1 3 3"),
        ),
    ),
    Card(
        listOf(
            PathPart("M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z", body = true),
            PathPart("M2.5 9.6h19"),
            PathPart("M6.2 15h3"),
        ),
    ),
    Document(
        listOf(
            PathPart("M6.6 3.5h6.9L18.5 8.5v10.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z", body = true),
            PathPart("M13.5 3.6v4.9h4.9"),
        ),
    ),
    DocumentText(
        listOf(
            PathPart("M6.6 3.5h6.9L18.5 8.5v10.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z", body = true),
            PathPart("M13.5 3.6v4.9h4.9"),
            PathPart("M8.6 12.6h6.8"),
            PathPart("M8.6 16.2h4.6"),
        ),
    ),
    DocumentUpload(
        listOf(
            PathPart("M6.6 3.5h6.9L18.5 8.5v10.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z", body = true),
            PathPart("M13.5 3.6v4.9h4.9"),
            PathPart("M12 17.2v-5.4"),
            PathPart("m9.6 14 2.4-2.4 2.4 2.4"),
        ),
    ),
    ShieldCheck(
        listOf(
            PathPart("M12 3.4 19 6v5.6c0 4.3-2.9 7.8-7 9-4.1-1.2-7-4.7-7-9V6l7-2.6Z", body = true),
            PathPart("m8.8 12.1 2.2 2.2 4.2-4.3"),
        ),
    ),
    Support(
        listOf(
            PathPart("M4.6 14v-2a7.4 7.4 0 0 1 14.8 0v2"),
            PathPart("M4.6 13.4h1.6a1 1 0 0 1 1 1v3.2a1 1 0 0 1-1 1h-.6a1 1 0 0 1-1-1v-4.2Z", body = true),
            PathPart("M19.4 13.4h-1.6a1 1 0 0 0-1 1v3.2a1 1 0 0 0 1 1h.6a1 1 0 0 0 1-1v-4.2Z", body = true),
            PathPart("M18.9 18.6c0 1.3-1.5 2-3.4 2h-2.3"),
        ),
    ),
    Mic(
        listOf(
            PathPart("M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3Z", body = true),
            PathPart("M6 11.2a6 6 0 0 0 12 0"),
            PathPart("M12 17.2v3.3"),
        ),
    ),
    Logout(
        listOf(
            PathPart("M13.8 4.5H7A1.5 1.5 0 0 0 5.5 6v12A1.5 1.5 0 0 0 7 19.5h6.8"),
            PathPart("M10.5 12h9.4"),
            PathPart("m16.4 8.5 3.5 3.5-3.5 3.5"),
        ),
    ),
    Language(
        listOf(
            CirclePart(12.0f, 12.0f, 8.6f, body = true),
            PathPart("M3.5 12h17"),
            PathPart("M12 3.4c2.2 2.3 3.3 5.2 3.3 8.6s-1.1 6.3-3.3 8.6c-2.2-2.3-3.3-5.2-3.3-8.6S9.8 5.7 12 3.4Z"),
        ),
    ),
    Mail(
        listOf(
            PathPart("M4.7 5.5h14.6A1.7 1.7 0 0 1 21 7.2v9.6a1.7 1.7 0 0 1-1.7 1.7H4.7A1.7 1.7 0 0 1 3 16.8V7.2a1.7 1.7 0 0 1 1.7-1.7Z", body = true),
            PathPart("m3.6 7.2 8.4 6 8.4-6"),
        ),
    ),
    Moon(
        listOf(
            PathPart("M19.6 14.6A8 8 0 0 1 9.4 4.4a8 8 0 1 0 10.2 10.2Z", body = true),
        ),
    ),
    Power(
        listOf(
            PathPart("M12 3.5v8"),
            PathPart("M7.1 6.6a7.2 7.2 0 1 0 9.8 0"),
        ),
    ),
    MicOff(
        listOf(
            PathPart("M15 11.3V6.5a3 3 0 0 0-5.6-1.5M9 9v2.5a3 3 0 0 0 4.6 2.5"),
            PathPart("M6 11.2a6 6 0 0 0 9.7 4.7M18 11.2a6 6 0 0 1-.4 2.1"),
            PathPart("M12 17.2v3.3"),
            PathPart("m4 4 16 16"),
        ),
    ),
    Dot(
        listOf(
            CirclePart(12.0f, 12.0f, 4.0f, dot = true),
        ),
    ),
}
