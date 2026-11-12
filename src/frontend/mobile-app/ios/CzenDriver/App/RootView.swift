import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @Environment(Preferences.self) private var prefs
    @Environment(WakeWordService.self) private var wakeWord

    var body: some View {
        Group {
            switch model.phase {
            case .launching:
                Palette.background.ignoresSafeArea()
            case .signedOut:
                AuthFlowView(initial: model.config.launch.authScreen)
                    .transition(.opacity)
            case .signedIn:
                AppShellView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: model.phase)
        .preferredColorScheme(prefs.theme == .dark ? .dark : .light)
        .tint(Palette.primary)
        .task { await model.bootstrap() }
        .onChange(of: model.phase) { wakeWord.sync() }
        .onChange(of: prefs.wakeWordEnabled) { wakeWord.sync() }
        .onChange(of: model.voice.status) { wakeWord.sync() }
    }
}

enum AppTab: Hashable { case home, trips, assistant, earnings, profile }

/// Tab shell: Trang chủ, Chuyến, [Czen orb], Thu nhập, Cá nhân — system Liquid Glass tab bar with
/// the animated glass orb floating over the centre slot.
struct AppShellView: View {
    @Environment(AppModel.self) private var model
    @Environment(ChatStore.self) private var chat
    @Environment(VoiceSession.self) private var voice
    @State private var selection: AppTab = .home
    @State private var tripsPath: [TripsRoute] = []
    @State private var profilePath: [ProfileRoute] = []
    @State private var confirmCancelCall = false
    @State private var missingPhone = false
    @State private var toast: String?
    @State private var toastTask: Task<Void, Never>?
    @State private var didApplyLaunch = false

    var body: some View {
        let tabs = Binding<AppTab>(
            get: { selection },
            set: { tab in
                if tab == .assistant { orbTapped() } else { selection = tab }
            }
        )
        ZStack {
            TabView(selection: tabs) {
                Tab("Trang chủ", systemImage: "house", value: AppTab.home) {
                    HomeView(selection: $selection)
                }
                Tab("Chuyến", systemImage: "steeringwheel", value: AppTab.trips) {
                    NavigationStack(path: $tripsPath) {
                        TripsView(path: $tripsPath)
                            .navigationDestination(for: TripsRoute.self) { route in
                                switch route {
                                case .addTrip: AddTripView(path: $tripsPath)
                                }
                            }
                    }
                }
                Tab(value: AppTab.assistant) {
                    Color.clear
                } label: {
                    Label { Text("Trợ lý") } icon: { Image(systemName: "circle.fill").opacity(0) }
                }
                Tab("Thu nhập", systemImage: "wallet.bifold", value: AppTab.earnings) {
                    NavigationStack { EarningsView(selection: $selection) }
                }
                Tab("Cá nhân", systemImage: "person", value: AppTab.profile) {
                    NavigationStack(path: $profilePath) {
                        ProfileView(path: $profilePath)
                            .navigationDestination(for: ProfileRoute.self) { ProfileDestination(route: $0, path: $profilePath) }
                    }
                }
            }
            .overlay(alignment: .bottom) {
                if !chat.panelOpen {
                    orbOverlay
                }
            }

            if chat.panelOpen {
                AssistantChatPanel(onCancelCall: { confirmCancelCall = true })
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(100)
            }
        }
        .animation(.spring(duration: 0.35), value: chat.panelOpen)
        .sheet(isPresented: offerPresented) {
            if let id = model.offerTripId {
                TripOfferSheet(tripId: id)
            }
        }
        .alert("Đang gọi khách", isPresented: $confirmCancelCall) {
            Button("Tiếp tục gọi", role: .cancel) {}
            Button("Huỷ cuộc gọi", role: .destructive) {
                chat.addUserMessage("Huỷ cuộc gọi")
                Task { _ = await voice.cancelCall() }
            }
        } message: {
            Text("Bạn muốn huỷ cuộc gọi này?")
        }
        .alert("Lỗi", isPresented: $missingPhone) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Không tìm thấy số điện thoại tài xế.")
        }
        .onChange(of: voice.userHangupCount) {
            // useReturnHomeOnVoiceEnd: a user hang-up closes the panel and returns home.
            chat.closePanel()
            selection = .home
        }
        // Whole message, not just `msg`: a streamed reply is finalised with the same text (only
        // `streaming` flips), and that is the moment the toast should show.
        .onChange(of: chat.chats.last) { showToastIfNeeded() }
        .task { applyLaunchOptions() }
    }

    private var offerPresented: Binding<Bool> {
        Binding(get: { model.offerTripId != nil }, set: { if !$0 { model.offerTripId = nil } })
    }

    private var orbOverlay: some View {
        VStack(spacing: 10) {
            if let toast {
                Text(toast)
                    .appText(.label)
                    .foregroundStyle(Palette.textPrimary)
                    .lineLimit(3)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .frame(width: 220)
                    .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .transition(.scale(scale: 0.8, anchor: .bottom).combined(with: .opacity))
                    .onTapGesture { chat.openPanel() }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Czen: \(toast)")
                    .accessibilityHint("Mở hội thoại với Czen")
                    .accessibilityAddTraits(.isButton)
                    .accessibilityAction { chat.openPanel() }
                    .accessibilityIdentifier("orb-toast")
            }
            Button(action: orbTapped) {
                CzenOrb(status: voice.status, level: voice.agentAudioLevel, speaking: voice.agentSpeaking, muted: voice.isMicMuted, size: 60)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(voice.orbAccessibilityLabel(panelOpen: chat.panelOpen))
            .accessibilityIdentifier("czen-orb")
        }
        .padding(.bottom, 22)
        .animation(.spring(duration: 0.35), value: toast)
    }

    /// Orb tap logic (`AssistantTabButton.handlePress`).
    private func orbTapped() {
        switch voice.status {
        case .connecting:
            return
        case .connected:
            if !chat.panelOpen {
                chat.openPanel()
            } else if voice.isCallActive {
                confirmCancelCall = true
            } else {
                voice.disconnect(userInitiated: true)
            }
        case .idle, .error:
            guard let phone = model.phone else { missingPhone = true; return }
            chat.openPanel()
            Task { await voice.connect(phone: phone) }
        }
    }

    private func showToastIfNeeded() {
        guard let last = chat.chats.last, last.who == .bot, !last.streaming, !chat.panelOpen, selection != .home else { return }
        toastTask?.cancel()
        toast = last.msg
        toastTask = Task {
            try? await Task.sleep(for: .seconds(4.5))
            if !Task.isCancelled { toast = nil }
        }
    }

    private func applyLaunchOptions() {
        guard !didApplyLaunch else { return }
        didApplyLaunch = true
        let launch = model.config.launch
        switch launch.startTab {
        case "trips": selection = .trips
        case "earnings": selection = .earnings
        case "profile": selection = .profile
        default: break
        }
        if let route = launch.route {
            if route == "add-trip" { selection = .trips; tripsPath = [.addTrip] } else if let r = ProfileRoute(rawValue: route) {
                selection = .profile
                profilePath = [r]
            }
        }
        if launch.openChat {
            chat.openPanel()
            if launch.connectVoice, let phone = model.phone {
                Task { await voice.connect(phone: phone) }
            } else if launch.connectVoice {
                Task {
                    try? await Task.sleep(for: .milliseconds(600))
                    if let phone = model.phone { await voice.connect(phone: phone) }
                }
            }
        }
    }
}
