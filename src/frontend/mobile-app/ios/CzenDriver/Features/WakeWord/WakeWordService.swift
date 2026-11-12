import AVFoundation
import Foundation
import Observation
import os
import Speech

/// Wake phrase matcher. The RN app used a Vosk grammar of the phrase plus decoy words; with open
/// on-device recognition we instead require "hey" immediately followed by an "AI" token, and only
/// accept the ambiguous "hey i"/"hey eye" when it ends the utterance (so "hey I need…" is a decoy).
enum WakePhrase {
    static func normalize(_ text: String) -> [String] {
        let lowered = text.lowercased().replacingOccurrences(of: "a.i.", with: "ai").replacingOccurrences(of: "a.i", with: "ai")
        return lowered.split(whereSeparator: { !$0.isLetter }).map(String.init)
    }

    static func matches(_ transcript: String) -> Bool {
        let t = normalize(transcript)
        guard t.count >= 2 else { return false }
        for i in 0..<(t.count - 1) where t[i] == "hey" || t[i] == "hay" {
            let next = t[i + 1]
            if next == "ai" { return true }
            if next == "a", i + 2 < t.count, t[i + 2] == "i" { return true }
            if (next == "i" || next == "eye" || next == "ay"), i + 1 == t.count - 1 { return true }
        }
        return false
    }
}

/// Hands-free wake word ("hey ai") on on-device `SFSpeechRecognizer` (en-US).
@MainActor
@Observable
final class WakeWordService {
    private(set) var listening = false
    private(set) var lastHeard = ""

    @ObservationIgnored private weak var model: AppModel?
    @ObservationIgnored private let enabled: Bool
    @ObservationIgnored private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    @ObservationIgnored private let engine = AVAudioEngine()
    @ObservationIgnored private var task: SFSpeechRecognitionTask?
    @ObservationIgnored private var sink: BufferSink?
    @ObservationIgnored private var restart: Task<Void, Never>?
    @ObservationIgnored private var failures = 0
    @ObservationIgnored private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "wakeword")

    init(model: AppModel, enabled: Bool) {
        self.model = model
        self.enabled = enabled
    }

    private var shouldListen: Bool {
        guard enabled, let model else { return false }
        return model.phase == .signedIn && model.prefs.wakeWordEnabled && model.voice.status == .idle
    }

    /// Call on sign-in, hands-free toggle and voice status changes.
    func sync() {
        if shouldListen {
            if !listening && restart == nil { schedule(after: .milliseconds(400)) }
        } else {
            restart?.cancel()
            restart = nil
            stop()
        }
    }

    private func schedule(after delay: Duration) {
        restart?.cancel()
        restart = Task { [weak self] in
            try? await Task.sleep(for: delay)
            guard !Task.isCancelled, let self else { return }
            self.restart = nil
            await self.start()
        }
    }

    private func start() async {
        guard shouldListen, !listening else { return }
        guard await Self.authorize(), let recognizer, recognizer.isAvailable else { retryAfterFailure(); return }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement, options: [.mixWithOthers, .defaultToSpeaker, .allowBluetoothHFP])
            try session.setActive(true)
            let request = SFSpeechAudioBufferRecognitionRequest()
            request.shouldReportPartialResults = true
            request.requiresOnDeviceRecognition = recognizer.supportsOnDeviceRecognition
            request.contextualStrings = ["hey AI"]
            let sink = BufferSink(request: request)
            self.sink = sink
            let input = engine.inputNode
            input.removeTap(onBus: 0)
            Self.installTap(on: input, sink: sink)
            engine.prepare()
            try engine.start()
            listening = true
            failures = 0
            task = Self.recognize(recognizer, request: request) { [weak self] text, isFinal, failed in
                Task { @MainActor in self?.handle(text: text, isFinal: isFinal, failed: failed) }
            }
        } catch {
            log.error("wake word start failed")
            stop()
            retryAfterFailure()
        }
    }

    private func handle(text: String, isFinal: Bool, failed: Bool) {
        guard listening else { return }
        lastHeard = text
        if WakePhrase.matches(text) {
            stop()
            trigger()
            return
        }
        if isFinal || failed {
            stop()
            schedule(after: failed ? .seconds(1) : .milliseconds(300))
        }
    }

    private func trigger() {
        guard let model, let phone = model.phone else { return }
        model.chat.openPanel()
        Task { await model.voice.connect(phone: phone) }
    }

    private func retryAfterFailure() {
        failures += 1
        let delay: Duration = failures <= 3 ? .seconds(failures) : .seconds(30)
        schedule(after: delay)
    }

    private func stop() {
        task?.cancel()
        task = nil
        sink?.end()
        sink = nil
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        listening = false
    }

    // The tap, recognition and authorisation callbacks run off the main thread, so their closures
    // are formed in nonisolated functions (a closure formed on the main actor would assert there).
    private nonisolated static func installTap(on input: AVAudioInputNode, sink: BufferSink) {
        input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buffer, _ in
            sink.append(buffer)
        }
    }

    private nonisolated static func recognize(_ recognizer: SFSpeechRecognizer, request: SFSpeechAudioBufferRecognitionRequest,
                                              onResult: @escaping @Sendable (String, Bool, Bool) -> Void) -> SFSpeechRecognitionTask {
        recognizer.recognitionTask(with: request) { result, error in
            onResult(result?.bestTranscription.formattedString ?? "", result?.isFinal ?? false, error != nil)
        }
    }

    private nonisolated static func authorize() async -> Bool {
        let speech: Bool = await withCheckedContinuation { c in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
        guard speech else { return false }
        return await AVAudioApplication.requestRecordPermission()
    }
}

/// The audio tap runs on a realtime thread; the request is only appended to and ended.
private final class BufferSink: @unchecked Sendable {
    // Safe: SFSpeechAudioBufferRecognitionRequest.append is documented as callable from the tap
    // thread; `end` happens after the tap is removed.
    private let request: SFSpeechAudioBufferRecognitionRequest
    init(request: SFSpeechAudioBufferRecognitionRequest) { self.request = request }
    func append(_ buffer: AVAudioPCMBuffer) { request.append(buffer) }
    func end() { request.endAudio() }
}
