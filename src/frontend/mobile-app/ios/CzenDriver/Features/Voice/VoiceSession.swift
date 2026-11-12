import AVFoundation
import Foundation
import Observation
import os

/// What a voice room reports back to the session (`voiceSessionStore.ts` handlers).
enum VoiceEvent: Sendable {
    /// A text-stream update (`lk.transcription` chunk or `lk.chat` message).
    case text(String, identity: String, isLocal: Bool, isFinal: Bool, segmentId: String?)
    /// `publishData` payload on a topic (`call_state`, `agent_state`).
    case data(topic: String, payload: Data)
    /// Level (0..1) of the first non-local active speaker.
    case agentLevel(Double)
    /// The room went away (remote drop, network, or our own disconnect).
    case disconnected
}

/// The room transport behind the session: LiveKit live, scripted fake in demo mode.
@MainActor
protocol VoiceEngine: AnyObject {
    var onEvent: ((VoiceEvent) -> Void)? { get set }
    var isConnected: Bool { get }
    func connect(url: String, token: String) async throws
    func setMicrophone(enabled: Bool) async throws -> Bool
    func sendChat(_ text: String) async throws
    func publish(topic: String, json: [String: String]) async throws
    func disconnect() async
}

/// Voice session state machine: idle → connecting → connected → idle / error.
@MainActor
@Observable
final class VoiceSession {
    enum Status: String { case idle, connecting, connected, error }

    private(set) var status: Status = .idle
    private(set) var agentAudioLevel: Double = 0
    private(set) var agentSpeaking = false
    private(set) var isCallActive = false
    private(set) var callMode = "" // "" | agent | bridge
    private(set) var isMicMuted = false
    /// Increments on every user-initiated hang-up that finished (drives "close panel and go home").
    private(set) var userHangupCount = 0

    @ObservationIgnored private let engine: VoiceEngine
    @ObservationIgnored private let api: DriverAPI
    @ObservationIgnored private let prefs: Preferences
    @ObservationIgnored private let audio: FillerAudio
    @ObservationIgnored private var pendingUserHangup = false
    /// The in-flight connect; a hang-up or logout while `.connecting` cancels it.
    @ObservationIgnored private var connectTask: Task<Void, Never>?
    /// Bumped by every connect and every cancel; a connect step that resumes under a newer
    /// generation stops and tears its room down instead of going live.
    @ObservationIgnored private var generation = 0
    /// A cancelled connect still unwinding; the next connect waits for it so its teardown can
    /// never drop the new room.
    @ObservationIgnored private var draining: Task<Void, Never>?
    @ObservationIgnored private var watchdog: Task<Void, Never>?
    @ObservationIgnored private var deduper = TranscriptDeduper()
    @ObservationIgnored var onMessage: ((String, ChatMessage.Who, Bool, String?) -> Void)?
    @ObservationIgnored private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "voice")
    @ObservationIgnored private let settleDelay: Duration
    @ObservationIgnored private let asksMicPermission: Bool

    init(engine: VoiceEngine, api: DriverAPI, prefs: Preferences, audio: FillerAudio, settleDelay: Duration = .milliseconds(350), asksMicPermission: Bool = true) {
        self.asksMicPermission = asksMicPermission
        self.engine = engine
        self.api = api
        self.prefs = prefs
        self.audio = audio
        self.settleDelay = settleDelay
        engine.onEvent = { [weak self] event in self?.handle(event) }
    }

    var isActive: Bool { status == .connecting || status == .connected }

    // MARK: Connect

    /// Connects (no-op while a connect is in flight or a room is live). Returns when the attempt
    /// finished: `.connected`, `.error`, or `.idle` after a cancel.
    func connect(phone: String) async {
        if connectTask != nil || status == .connecting || engine.isConnected { return }
        generation += 1
        let gen = generation
        status = .connecting
        resetState()
        let previous = draining
        let task = Task {
            await previous?.value
            await self.runConnect(phone: phone, gen: gen)
        }
        connectTask = task
        await task.value
        if connectTask == task { connectTask = nil }
    }

    private struct Superseded: Error {}

    /// Throws when the attempt was cancelled or replaced while it was suspended.
    private func checkCurrent(_ gen: Int) throws {
        if Task.isCancelled || gen != generation { throw Superseded() }
    }

    private func runConnect(phone: String, gen: Int) async {
        let started = Date()
        do {
            try await Task.sleep(for: settleDelay) // let the wake-word mic release
            try checkCurrent(gen)
            async let token = api.voiceToken(phone: phone, lang: prefs.voiceLang.rawValue)
            await audio.playConnecting()
            let granted = asksMicPermission ? await AVAudioApplication.requestRecordPermission() : true
            if !granted { log.notice("mic permission denied") }
            let tok = try await token
            try checkCurrent(gen)
            await audio.fadeOutConnecting()
            try await Task.sleep(for: .milliseconds(160))
            try checkCurrent(gen)
            try await engine.connect(url: tok.livekitUrl, token: tok.token)
            try checkCurrent(gen)
            if try await !engine.setMicrophone(enabled: true) {
                try checkCurrent(gen)
                _ = try await engine.setMicrophone(enabled: false)
                try await Task.sleep(for: .milliseconds(200))
                try checkCurrent(gen)
                _ = try await engine.setMicrophone(enabled: true)
            }
            try checkCurrent(gen)
            status = .connected
            isMicMuted = false
            log.info("voice connected in \(Date().timeIntervalSince(started), privacy: .public)s")
            startWatchdog()
        } catch {
            let cancelled = error is Superseded || error is CancellationError || (error as? APIError) == .cancelled || Task.isCancelled || gen != generation
            if !cancelled { log.error("voice connect failed: \(String(describing: error), privacy: .public)") }
            await teardownAfterFailure(gen: gen, cancelled: cancelled)
        }
    }

    /// Always drops the room (never leave a live mic behind); only the current attempt may
    /// change the visible status.
    private func teardownAfterFailure(gen: Int, cancelled: Bool) async {
        await engine.disconnect()
        guard gen == generation else { return }
        watchdog?.cancel()
        audio.stopAll()
        resetState()
        status = (cancelled || pendingUserHangup) ? .idle : .error
        pendingUserHangup = false
    }

    private func startWatchdog() {
        watchdog?.cancel()
        watchdog = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(4))
                guard let self, self.status == .connected else { return }
                if !self.engine.isConnected { await self.handleDisconnected() }
            }
        }
    }

    /// Ends the session. `userInitiated` plays the goodbye filler and closes the panel.
    /// While `.connecting` it cancels the in-flight connect and returns to `.idle` at once.
    func disconnect(userInitiated: Bool = false) {
        audio.stopAll()
        if status == .connecting || connectTask != nil {
            generation += 1
            let inFlight = connectTask
            inFlight?.cancel()
            connectTask = nil
            pendingUserHangup = false
            watchdog?.cancel()
            resetState()
            status = .idle
            let previous = draining
            draining = Task { [engine] in
                await engine.disconnect() // aborts a room.connect that is still in flight
                await inFlight?.value
                await previous?.value
            }
            return
        }
        pendingUserHangup = userInitiated && isActive
        Task { await engine.disconnect() }
    }

    func setMicMuted(_ muted: Bool) async {
        guard status == .connected else { return }
        do {
            _ = try await engine.setMicrophone(enabled: !muted)
            isMicMuted = muted
        } catch {
            log.error("mic toggle failed")
        }
    }

    func sendText(_ text: String) async -> Bool {
        guard status == .connected else { return false }
        do { try await engine.sendChat(text); return true } catch { return false }
    }

    /// `call_control` `{"action":"cancel"}` — hang up the customer call the agent runs.
    func cancelCall() async -> Bool {
        guard status == .connected else { return false }
        do { try await engine.publish(topic: "call_control", json: ["action": "cancel"]); return true } catch { return false }
    }

    // MARK: Events

    private func handle(_ event: VoiceEvent) {
        switch event {
        case let .data(topic, payload):
            guard let obj = try? JSONSerialization.jsonObject(with: payload) as? [String: Any] else { return }
            if topic == "call_state", obj["type"] as? String == "call_state" {
                let active = obj["active"] as? Bool ?? false
                let mode = obj["mode"] as? String ?? ""
                isCallActive = active
                callMode = active && (mode == "agent" || mode == "bridge") ? mode : ""
            } else if topic == "agent_state", obj["type"] as? String == "agent_state" {
                let state = obj["state"] as? String ?? ""
                agentSpeaking = state == "speaking" || state == "thinking"
            }
        case let .agentLevel(level):
            agentAudioLevel = level
        case let .text(text, identity, isLocal, isFinal, segmentId):
            emit(text: text, identity: identity, isLocal: isLocal, isFinal: isFinal, segmentId: segmentId)
        case .disconnected:
            Task { await handleDisconnected() }
        }
    }

    func emit(text: String, identity: String, isLocal: Bool, isFinal: Bool, segmentId: String?) {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let isCustomer = isCallActive && identity.lowercased().hasPrefix("customer-")
        let who: ChatMessage.Who = isLocal ? .me : isCustomer ? .customer : .bot
        if who == .bot && TranscriptDeduper.isRawToolToken(text) { return }
        if isFinal {
            guard deduper.admit(from: who.rawValue, text: text, now: Date().timeIntervalSince1970) else { return }
            if callMode == "bridge" && who == .customer {
                let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
                Task { try? await engine.publish(topic: "call_transcript", json: ["speaker": "customer", "text": trimmed]) }
            }
        }
        onMessage?(text, who, isFinal, segmentId)
    }

    /// Only a live session can drop: a failed or cancelled connect already settled its own
    /// status, so the engine's `.disconnected` from that teardown must not turn `.error` into `.idle`.
    private func handleDisconnected() async {
        guard status == .connected else { return }
        watchdog?.cancel()
        let hangup = pendingUserHangup
        pendingUserHangup = false
        resetState()
        status = .idle
        if hangup {
            userHangupCount += 1
            await audio.playDisconnecting()
        }
    }

    private func resetState() {
        agentAudioLevel = 0
        isCallActive = false
        callMode = ""
        agentSpeaking = false
        isMicMuted = false
    }
}
