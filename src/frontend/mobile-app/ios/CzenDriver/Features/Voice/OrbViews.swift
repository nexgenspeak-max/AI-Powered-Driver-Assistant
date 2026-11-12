import SwiftUI

/// The Czen orb: idle gradient; counter-rotating gradient layers while connecting (8 s) /
/// connected (12 s); bloom + scale follow the agent's audio level; wave bars when connected.
struct CzenOrb: View {
    var status: VoiceSession.Status
    var level: Double
    var speaking: Bool
    var muted: Bool
    var size: CGFloat = 64

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.scenePhase) private var scenePhase

    private var live: Bool { status == .connecting || status == .connected }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion || scenePhase != .active)) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            let period = status == .connecting ? 8.0 : 12.0
            let angleA = Angle.degrees((t / period).truncatingRemainder(dividingBy: 1) * 360)
            let angleB = Angle.degrees(-(t / (period * 1.35)).truncatingRemainder(dividingBy: 1) * 360)
            let breathe = reduceMotion ? 0 : (sin(t * 2 * .pi / 3.2) + 1) / 2
            let energy = status == .connected ? max(level, speaking ? 0.35 + 0.15 * sin(t * 6) : 0) : 0
            let scale = 1 + (status == .idle || status == .error ? breathe * 0.03 : energy * 0.12)

            ZStack {
                // bloom
                Circle()
                    .fill(Palette.primary.opacity(live ? 0.55 : 0.35))
                    .frame(width: size, height: size)
                    .blur(radius: 14 + energy * 16)
                    .scaleEffect(1.05 + breathe * 0.08 + energy * 0.3)
                // pulse ring
                if live && !reduceMotion {
                    let p = (t / 1.8).truncatingRemainder(dividingBy: 1)
                    Circle().stroke(Palette.accentLight.opacity(0.6 * (1 - p)), lineWidth: 2)
                        .frame(width: size, height: size)
                        .scaleEffect(1 + p * 0.45)
                }
                core(angleA: angleA, angleB: angleB)
                    .frame(width: size - 8, height: size - 8)
                    .padding(4)
                    .glassEffect(.regular.tint(Palette.primary.opacity(0.25)).interactive(), in: Circle())
                    .scaleEffect(scale)
                center(t: t, energy: energy)
                if muted {
                    Circle().fill(Palette.danger).frame(width: 14, height: 14)
                        .overlay(Circle().stroke(.white, lineWidth: 2))
                        .offset(x: size * 0.34, y: -size * 0.34)
                }
            }
        }
        .frame(width: size, height: size)
    }

    @ViewBuilder
    private func core(angleA: Angle, angleB: Angle) -> some View {
        ZStack {
            if live {
                Circle().fill(AngularGradient(colors: [Color(hex: 0x7C3AED), Color(hex: 0x8B5CF6), Color(hex: 0xA855F7), Color(hex: 0xC4B5FD), Color(hex: 0x7C3AED)], center: .center))
                    .rotationEffect(angleA)
                Circle().fill(AngularGradient(colors: [Color(hex: 0x6D28D9), Color(hex: 0x9333EA), Color(hex: 0xA855F7), Color(hex: 0xDDD6FE), Color(hex: 0x6D28D9)], center: .center))
                    .rotationEffect(angleB)
                    .opacity(0.55)
                    .blendMode(.plusLighter)
            } else {
                Circle().fill(Palette.orbIdle)
            }
            Circle().fill(LinearGradient(colors: [.white.opacity(0.4), .clear], startPoint: .top, endPoint: .center))
        }
        .clipShape(Circle())
    }

    @ViewBuilder
    private func center(t: Double, energy: Double) -> some View {
        switch status {
        case .connected:
            HStack(spacing: 3) {
                ForEach(0..<5, id: \.self) { i in
                    let phase = sin(t * 7 + Double(i) * 1.1)
                    let h = 0.25 + (energy > 0.02 ? (0.35 + 0.4 * abs(phase)) * min(1, energy * 1.6 + 0.2) : 0.1 + 0.08 * abs(phase))
                    Capsule().fill(.white).frame(width: 3.5, height: size * 0.42 * h)
                }
            }
        case .connecting:
            CzenMark().frame(width: size * 0.5, height: size * 0.5)
                .opacity(0.6 + 0.4 * (sin(t * 4) + 1) / 2)
        case .idle, .error:
            CzenMark().frame(width: size * 0.5, height: size * 0.5)
        }
    }
}

extension VoiceSession {
    /// Orb accessibility labels (`assistantTabButtonShared.tsx`).
    func orbAccessibilityLabel(panelOpen: Bool) -> String {
        if status == .connected && isMicMuted { return "Trợ lý AI đang kết nối, micro tắt. Nhấn để kết thúc phiên." }
        if status == .connected && !panelOpen { return "Trợ lý AI đang kết nối. Nhấn để mở lại hội thoại." }
        switch status {
        case .idle: return "Trợ lý AI, đang tắt. Nhấn để bắt đầu hội thoại."
        case .connecting: return "Trợ lý AI đang kết nối, vui lòng chờ."
        case .connected: return "Trợ lý AI, đang bật. Nhấn để kết thúc phiên."
        case .error: return "Trợ lý AI, đã xảy ra lỗi. Nhấn để thử lại."
        }
    }
}
