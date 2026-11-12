import SwiftUI

/// Full-screen assistant chat overlay (`AssistantChatPanel.tsx`).
struct AssistantChatPanel: View {
    @Environment(AppModel.self) private var model
    @Environment(ChatStore.self) private var chat
    @Environment(VoiceSession.self) private var voice
    @Environment(Preferences.self) private var prefs
    var onCancelCall: () -> Void

    @State private var text = ""
    @State private var error: String?
    @State private var stubLoading = false
    @FocusState private var focused: Bool
    @Namespace private var glass

    private var lang: Preferences.VoiceLang { prefs.voiceLang }

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 10) {
                        if chat.chats.isEmpty { emptyState }
                        ForEach(chat.chats) { bubble($0).id($0.id) }
                        if stubLoading {
                            HStack { Text("Đang trả lời...").appText(.caption).foregroundStyle(Palette.textMuted); Spacer() }
                        }
                        if !chat.chats.contains(where: { $0.who == .me }) { suggestions }
                        Color.clear.frame(height: 8).id("bottom")
                    }
                    .padding(.horizontal, Spacing.s4)
                    .padding(.top, Spacing.s3)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: chat.chats) { withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo("bottom", anchor: .bottom) } }
            }
            if let error {
                Text(error).appText(.caption).foregroundStyle(Palette.danger).padding(.bottom, 4)
            }
            composer
        }
        .background {
            ZStack {
                Palette.background
                LinearGradient(colors: [Palette.primary.opacity(0.18), .clear], startPoint: .top, endPoint: .center)
            }
            .ignoresSafeArea()
        }
        .accessibilityElement(children: .contain).accessibilityIdentifier("chat-panel")
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: Spacing.s3) {
            Button { chat.closePanel() } label: {
                Image(systemName: "chevron.down").font(.system(size: 17, weight: .semibold)).frame(width: 44, height: 44)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .accessibilityLabel("Thu nhỏ hội thoại")
            .accessibilityIdentifier("chat-close")
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text("Czen").appText(.h2).foregroundStyle(Palette.textPrimary)
                    statusChip
                }
                Text(caption).appText(.caption).foregroundStyle(Palette.textSecondary).lineLimit(2)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Spacing.s4)
        .padding(.top, Spacing.s2)
        .padding(.bottom, Spacing.s2)
    }

    private var statusChip: some View {
        let en = lang == .en
        let spec: (String, Color, Color, Color) = {
            switch voice.status {
            case .connected where voice.isMicMuted: return (en ? "Mic off" : "Mic tắt", Palette.warning, Palette.warningContainer, Color("OnWarningContainer"))
            case .connected: return (en ? "Listening" : "Đang nghe", Palette.success, Palette.successContainer, Palette.onSuccessContainer)
            case .connecting: return (en ? "Connecting" : "Đang kết nối", Palette.primary, Palette.primaryContainer, Palette.onPrimaryContainer)
            case .error: return (en ? "Error" : "Lỗi", Palette.danger, Palette.dangerContainer, Palette.onDangerContainer)
            case .idle: return (en ? "Off" : "Tắt", Palette.textMuted, Palette.surfaceVariant, Palette.textSecondary)
            }
        }()
        return HStack(spacing: 6) {
            Circle().fill(spec.1).frame(width: 6, height: 6)
            Text(spec.0).appText(.caption).foregroundStyle(spec.3)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 4)
        .background(spec.2, in: Capsule())
        .accessibilityIdentifier("chat-status")
    }

    static let captions: [Preferences.VoiceLang: [String: String]] = [
        .vn: ["idle": "Chạm nút Czen cạnh ô nhập để kết nối", "connecting": "Đang kết nối với Czen…",
              "connected": "Đã kết nối — chạm sóng âm để kết thúc", "error": "Kết nối lỗi — chạm nút Czen để thử lại",
              "inCall": "Đang gọi khách — chạm nút Czen để huỷ cuộc gọi", "micOff": "Mic đang tắt — phiên vẫn kết nối"],
        .en: ["idle": "Tap the Czen button next to the input to connect", "connecting": "Connecting to Czen…",
              "connected": "Connected to Czen — tap the waveform to end", "error": "Connection failed — tap the Czen button to try again",
              "inCall": "In a call — can't disconnect", "micOff": "Mic is off — the session is still connected"],
    ]

    private var caption: String {
        let copy = Self.captions[lang] ?? [:]
        if voice.status == .connected && voice.isCallActive { return copy["inCall"] ?? "" }
        if voice.status == .connected && voice.isMicMuted { return copy["micOff"] ?? "" }
        return copy[voice.status.rawValue] ?? ""
    }

    // MARK: Content

    private var emptyState: some View {
        VStack(spacing: Spacing.s3) {
            ZStack {
                Circle().fill(Palette.orbIdle).frame(width: 72, height: 72)
                CzenMark().frame(width: 38, height: 38)
            }
            .shadow(color: Palette.primary.opacity(0.4), radius: 18, y: 6)
            Text("Nói với Czen").appText(.h2).foregroundStyle(Palette.textPrimary)
            Text(voice.status == .connected ? "Czen đang nghe. Hỏi về chuyến, khách hay thu nhập." : "Chạm nút Czen cạnh ô nhập rồi nói, hoặc chọn một gợi ý.")
                .appText(.body).foregroundStyle(Palette.textSecondary).multilineTextAlignment(.center)
        }
        .padding(.top, 48)
        .padding(.horizontal, Spacing.s5)
    }

    private var suggestions: some View {
        let items = lang == .en ? ["Today's schedule", "Call the rider", "Today's earnings", "Where next?"]
                                : ["Lịch hôm nay", "Gọi khách", "Thu nhập hôm nay", "Nên đi đâu tiếp?"]
        return FlowChips(items: items) { send($0) }
            .padding(.top, Spacing.s3)
    }

    private func bubble(_ m: ChatMessage) -> some View {
        let isMe = m.who == .me
        return HStack {
            if isMe { Spacer(minLength: 48) }
            VStack(alignment: .leading, spacing: 2) {
                if m.who == .customer { Text("Khách").appText(.caption).foregroundStyle(Palette.warning) }
                Text(m.msg).appText(.body).foregroundStyle(isMe ? .white : Palette.textPrimary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background {
                let shape = RoundedRectangle(cornerRadius: Radius.bubble, style: .continuous)
                switch m.who {
                case .me: shape.fill(Palette.cta)
                case .customer: shape.fill(Palette.bubbleCustomer)
                case .bot: shape.fill(Palette.bubbleBot).shadow(color: .black.opacity(0.06), radius: 4, y: 1)
                }
            }
            .opacity(m.streaming ? 0.78 : 1)
            if !isMe { Spacer(minLength: 48) }
        }
        .frame(maxWidth: .infinity, alignment: isMe ? .trailing : .leading)
        .accessibilityElement(children: .combine)
    }

    // MARK: Composer (56 pt glass pill)

    private var composer: some View {
        GlassEffectContainer(spacing: 10) {
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    Button { Task { await voice.setMicMuted(!voice.isMicMuted) } } label: {
                        Image(systemName: voice.isMicMuted ? "mic.slash.fill" : "mic.fill")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(voice.status != .connected ? Palette.textMuted : (voice.isMicMuted ? Palette.danger : Palette.primary))
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .disabled(voice.status != .connected)
                    .accessibilityLabel(voice.status != .connected ? "Micro, chưa kết nối" : (voice.isMicMuted ? "Bật micro" : "Tắt micro, giữ kết nối"))
                    .accessibilityIdentifier("chat-mic")
                    TextField(placeholder, text: $text, axis: .vertical)
                        .appText(.body)
                        .lineLimit(1...4)
                        .focused($focused)
                        .submitLabel(.send)
                        .onSubmit { send(text) }
                        .accessibilityIdentifier("chat-input")
                }
                .padding(.leading, 6)
                .padding(.trailing, 14)
                .frame(minHeight: 56)
                .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 28, style: .continuous))
                .glassEffectID("field", in: glass)

                if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Button { send(text) } label: {
                        Image(systemName: "arrow.up").font(.system(size: 18, weight: .bold)).foregroundStyle(.white).frame(width: 56, height: 56)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.tint(Palette.primary).interactive(), in: Circle())
                    .glassEffectID("action", in: glass)
                    .accessibilityLabel("Gửi tin nhắn")
                    .accessibilityIdentifier("chat-send")
                } else {
                    ComposerVoiceButton(onCancelCall: onCancelCall)
                        .glassEffectID("action", in: glass)
                }
            }
        }
        .animation(.spring(duration: 0.3), value: text.isEmpty)
        .padding(.horizontal, Spacing.s4)
        .padding(.bottom, Spacing.s2)
        .padding(.top, Spacing.s2)
    }

    private var placeholder: String {
        switch voice.status {
        case .connecting: "Đang kết nối..."
        case .connected: "Nói gì đó..."
        default: "Kết nối Trợ lý AI để chat..."
        }
    }

    private func send(_ raw: String) {
        focused = false
        guard !raw.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            error = "Bạn chưa nhập nội dung."
            return
        }
        error = nil
        text = ""
        Task {
            if voice.status == .connected {
                chat.upsert(who: .me, msg: raw, isFinal: true)
                if await voice.sendText(raw) { return }
            } else {
                chat.addUserMessage(raw)
            }
            // Offline fallback: canned local reply (services/api/assistant.ts).
            stubLoading = true
            try? await Task.sleep(for: .milliseconds(600))
            chat.addBotMessage(Self.cannedReply())
            stubLoading = false
        }
    }

    static func cannedReply() -> String {
        ["Mình đã ghi nhận yêu cầu của bạn, để mình kiểm tra thêm nhé.",
         "Bạn có thể xem chuyến đi hiện tại ở tab Dashboard.",
         "Cảm ơn bạn đã chia sẻ, mình sẽ hỗ trợ bạn ngay."].randomElement()!
    }
}

/// 44 pt voice button: mark when idle, spinner connecting, 4 bars when connected.
struct ComposerVoiceButton: View {
    @Environment(AppModel.self) private var model
    @Environment(ChatStore.self) private var chat
    @Environment(VoiceSession.self) private var voice
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var onCancelCall: () -> Void

    var body: some View {
        Button(action: tap) {
            ZStack {
                Circle().fill(LinearGradient(colors: [Palette.deepViolet, Palette.gradientStart, Palette.orbLight], startPoint: .topLeading, endPoint: .bottomTrailing))
                switch voice.status {
                case .connecting:
                    ProgressView().tint(.white)
                case .connected:
                    TimelineView(.animation(minimumInterval: 1 / 30, paused: reduceMotion)) { tl in
                        let t = tl.date.timeIntervalSinceReferenceDate
                        let level = max(voice.agentAudioLevel, voice.agentSpeaking ? 0.4 : 0.08)
                        HStack(spacing: 3) {
                            ForEach(0..<4, id: \.self) { i in
                                Capsule().fill(.white).frame(width: 3.5, height: 8 + 16 * level * (0.6 + 0.4 * abs(sin(t * 6 + Double(i)))))
                            }
                        }
                    }
                default:
                    CzenMark().frame(width: 26, height: 26)
                }
            }
            .frame(width: 48, height: 48)
            .frame(width: 56, height: 56)
        }
        .buttonStyle(.plain)
        .glassEffect(.regular.interactive(), in: Circle())
        .accessibilityLabel(voice.orbAccessibilityLabel(panelOpen: true))
        .accessibilityIdentifier("chat-voice")
    }

    private func tap() {
        switch voice.status {
        case .connecting: return
        case .connected:
            if voice.isCallActive { onCancelCall() } else { voice.disconnect(userInitiated: true) }
        case .idle, .error:
            guard let phone = model.phone else { return }
            Task { await voice.connect(phone: phone) }
        }
    }
}

/// Wrapping suggestion chips.
struct FlowChips: View {
    var items: [String]
    var onTap: (String) -> Void
    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items, id: \.self) { item in
                Button { onTap(item) } label: {
                    Text(item).appText(.label).foregroundStyle(Palette.onPrimaryContainer)
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(Palette.primaryContainer, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxW = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, width: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x > 0 && x + size.width > maxW { x = 0; y += rowH + spacing; rowH = 0 }
            x += size.width + spacing
            rowH = max(rowH, size.height)
            width = max(width, x - spacing)
        }
        return CGSize(width: min(width, maxW), height: y + rowH)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x > bounds.minX && x + size.width > bounds.maxX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowH = max(rowH, size.height)
        }
    }
}
