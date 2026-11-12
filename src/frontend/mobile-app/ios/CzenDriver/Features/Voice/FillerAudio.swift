import AVFoundation
import Foundation

/// Connecting / disconnecting fillers and the new-trip alert (`czenFillerAudio.ts`).
@MainActor
final class FillerAudio {
    private var connecting: AVAudioPlayer?
    private var disconnecting: AVAudioPlayer?
    private var alert: AVAudioPlayer?
    private let enabled: Bool

    init(enabled: Bool = true) { self.enabled = enabled }

    private func player(_ name: String) -> AVAudioPlayer? {
        guard enabled, let url = Bundle.main.url(forResource: name, withExtension: "mp3") else { return nil }
        return try? AVAudioPlayer(contentsOf: url)
    }

    private func activatePlayback() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)
    }

    func playConnecting() async {
        guard let p = player("connecting-czen") else { return }
        activatePlayback()
        p.volume = 0
        p.play()
        p.setVolume(1, fadeDuration: 0.25)
        connecting = p
    }

    func fadeOutConnecting() async {
        guard let p = connecting else { return }
        p.setVolume(0, fadeDuration: 0.2)
        try? await Task.sleep(for: .milliseconds(220))
        p.stop()
        connecting = nil
    }

    func playDisconnecting() async {
        guard let p = player("disconnecting-czen") else { return }
        activatePlayback()
        disconnecting = p
        p.play()
        try? await Task.sleep(for: .seconds(min(p.duration, 3)))
        p.stop()
        disconnecting = nil
    }

    func playOfferAlert() {
        guard let p = player("new-trip-alert") else { return }
        activatePlayback()
        alert = p
        p.play()
    }

    func stopAll() {
        connecting?.stop(); connecting = nil
        disconnecting?.stop(); disconnecting = nil
    }
}
