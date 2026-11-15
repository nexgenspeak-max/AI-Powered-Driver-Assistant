import CoreLocation
import Foundation
import Observation
import os

/// Driver location: foreground live push with the distance-based cadence, background push while
/// online (≤ 1 per 20 s unless moved 150 m) and immediate pushes (`useLiveDriverLocation`,
/// `locationTracking.ts`, `pushImmediateLocation.ts`).
@MainActor
@Observable
final class LocationTracker: NSObject {
    private(set) var current: LatLng?
    private(set) var course: Double = 0
    private(set) var authorization: CLAuthorizationStatus = .notDetermined

    @ObservationIgnored private let manager = CLLocationManager()
    @ObservationIgnored private let api: DriverAPI
    @ObservationIgnored private let demo: Bool
    /// False in demo mode and in unit tests: `CLLocationManager` is never asked for anything.
    @ObservationIgnored private let usesSystemLocation: Bool
    @ObservationIgnored private var lastFixAt: Date?
    @ObservationIgnored private var lastLivePushAt: TimeInterval = 0
    @ObservationIgnored private var lastLivePushed: LatLng?
    @ObservationIgnored private var lastBgPushAt: TimeInterval = 0
    @ObservationIgnored private var lastBgPushed: LatLng?
    @ObservationIgnored private var tick: Task<Void, Never>?
    @ObservationIgnored private var fixWaiters: [CheckedContinuation<LatLng?, Never>] = []
    @ObservationIgnored private let log = Logger(subsystem: "com.chinhtruongba.driverapp", category: "location")
    @ObservationIgnored var isOnline: () -> Bool = { false }
    @ObservationIgnored var activeStops: () -> [LatLng] = { [] }
    @ObservationIgnored private(set) var backgroundTracking = false
    /// True between `startForeground()` and `stopForeground()`.
    @ObservationIgnored private(set) var foregroundActive = false
    /// True while the scene is in the background (balanced accuracy, 100 m filter).
    @ObservationIgnored private(set) var inBackground = false

    init(api: DriverAPI, demo: Bool, usesSystemLocation: Bool? = nil) {
        self.api = api
        self.demo = demo
        self.usesSystemLocation = usesSystemLocation ?? !demo
        super.init()
        if demo {
            current = LatLng(lat: 21.0333, lng: 105.8200)
            authorization = .authorizedWhenInUse
        } else if self.usesSystemLocation {
            manager.delegate = self
            applyUpdateSettings()
            manager.activityType = .automotiveNavigation
            authorization = manager.authorizationStatus
        }
    }

    /// Foreground watch (3 s / 5 m) plus a 15 s wall-clock tick that refreshes a fix older than 10 s.
    func startForeground() {
        foregroundActive = true
        guard usesSystemLocation else { return }
        if manager.authorizationStatus == .notDetermined { manager.requestWhenInUseAuthorization() }
        manager.startUpdatingLocation()
        tick?.cancel()
        tick = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(15))
                guard let self else { return }
                if let at = self.lastFixAt, Date().timeIntervalSince(at) > 10 { self.manager.requestLocation() }
            }
        }
    }

    /// Sign-out: stop the watch and the wall-clock tick, release anyone awaiting a fix.
    func stopForeground() {
        foregroundActive = false
        tick?.cancel()
        tick = nil
        resumeWaiters(with: current)
        guard usesSystemLocation else { return }
        manager.stopUpdatingLocation()
    }

    /// Foreground: 10 m accuracy / 5 m filter. Background (parity map §4): balanced accuracy and
    /// a 100 m filter, so the online driver's battery is not spent on navigation-grade fixes.
    nonisolated static func updateSettings(inBackground: Bool) -> (accuracy: CLLocationAccuracy, distanceFilter: CLLocationDistance) {
        inBackground ? (kCLLocationAccuracyHundredMeters, 100) : (kCLLocationAccuracyNearestTenMeters, 5)
    }

    /// Call on scene-phase changes.
    func setInBackground(_ background: Bool) {
        guard inBackground != background else { return }
        inBackground = background
        guard usesSystemLocation else { return }
        applyUpdateSettings()
    }

    private func applyUpdateSettings() {
        let settings = Self.updateSettings(inBackground: inBackground)
        manager.desiredAccuracy = settings.accuracy
        manager.distanceFilter = settings.distanceFilter
    }

    /// "Always" is asked for in context: only while background tracking is wanted and the driver
    /// has already granted When-In-Use (iOS ignores the request before that).
    nonisolated static func shouldRequestAlways(backgroundTracking: Bool, status: CLAuthorizationStatus) -> Bool {
        backgroundTracking && status == .authorizedWhenInUse
    }

    /// Background tracking while online; asks for Always authorisation in context.
    func setBackgroundTracking(_ on: Bool) {
        backgroundTracking = on
        guard usesSystemLocation else { return }
        if on {
            if Self.shouldRequestAlways(backgroundTracking: on, status: manager.authorizationStatus) { manager.requestAlwaysAuthorization() }
            manager.allowsBackgroundLocationUpdates = manager.authorizationStatus == .authorizedAlways
            manager.showsBackgroundLocationIndicator = true
            manager.pausesLocationUpdatesAutomatically = false
            if let here = current { Task { await pushBackground(here, force: true) } }
        } else {
            manager.allowsBackgroundLocationUpdates = false
            manager.showsBackgroundLocationIndicator = false
        }
    }

    /// A fresh GPS fix (arrival actions read one before PATCHing the trip).
    func freshFix(timeout: Duration = .seconds(5)) async -> LatLng? {
        if demo { return current }
        if let at = lastFixAt, Date().timeIntervalSince(at) < 5 { return current }
        // No permission, no fix: answer with the last known point instead of waiting out the timeout.
        if authorization == .denied || authorization == .restricted { return current }
        if usesSystemLocation { manager.requestLocation() }
        let fallback = current
        // Whichever comes first resumes every waiter: a new fix, or the timeout with the last fix.
        let timer = Task { [weak self] in
            try? await Task.sleep(for: timeout)
            if !Task.isCancelled { self?.resumeWaiters(with: fallback) }
        }
        let fix = await withCheckedContinuation { fixWaiters.append($0) }
        timer.cancel()
        return fix ?? fallback
    }

    /// `didFailWithError`: a denied permission releases everyone awaiting a fix at once (with the
    /// last known point). Other errors are transient — Core Location keeps trying.
    func handleLocationFailure(denied: Bool) {
        guard denied else { return }
        resumeWaiters(with: current)
    }

    /// `locationManagerDidChangeAuthorization`.
    func handleAuthorizationChange(_ status: CLAuthorizationStatus) {
        authorization = status
        if status == .denied || status == .restricted { resumeWaiters(with: current) }
        guard usesSystemLocation else { return }
        if foregroundActive, status == .authorizedWhenInUse || status == .authorizedAlways { manager.startUpdatingLocation() }
        if backgroundTracking { manager.allowsBackgroundLocationUpdates = status == .authorizedAlways }
        // Already online at sign-in: `setBackgroundTracking(true)` ran while the status was still
        // undetermined, so the upgrade to Always is requested here, once When-In-Use lands.
        if Self.shouldRequestAlways(backgroundTracking: backgroundTracking, status: status) { manager.requestAlwaysAuthorization() }
    }

    private func resumeWaiters(with value: LatLng?) {
        let waiters = fixWaiters
        fixWaiters.removeAll()
        waiters.forEach { $0.resume(returning: value) }
    }

    /// `pushImmediateLocation(scope?)`: accept, `trip_confirmed`, new active trip, navigation
    /// start and proximity settings changes.
    func pushImmediate(scope: String? = nil) async {
        guard let here = await freshFix() else { return }
        do {
            try await api.pushLiveLocation(here, scope: scope)
            lastLivePushAt = Date().timeIntervalSince1970
            lastLivePushed = here
        } catch {
            log.notice("immediate push failed")
        }
    }

    /// Demo / UI tests: move the simulated driver.
    func simulate(_ point: LatLng, course: Double = 0) {
        handleFix(point, course: course)
    }

    private func handleFix(_ here: LatLng, course: Double) {
        current = here
        if course >= 0 { self.course = course }
        lastFixAt = Date()
        resumeWaiters(with: here)
        guard isOnline(), !demo else { return }
        let now = Date().timeIntervalSince1970
        if PushCadence.shouldPush(now: now, lastPushAt: lastLivePushAt, here: here, lastPushed: lastLivePushed, stops: activeStops()) {
            lastLivePushAt = now
            lastLivePushed = here
            Task { try? await api.pushLiveLocation(here, scope: nil) }
        }
        if backgroundTracking {
            Task { await pushBackground(here, force: false) }
        }
    }

    private func pushBackground(_ here: LatLng, force: Bool) async {
        let now = Date().timeIntervalSince1970
        guard force || PushCadence.shouldPushBackground(now: now, lastPushAt: lastBgPushAt, here: here, lastPushed: lastBgPushed) else { return }
        lastBgPushAt = now
        lastBgPushed = here
        try? await api.pushLocation(here)
    }
}

extension LocationTracker: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        let point = LatLng(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
        let course = loc.course
        Task { @MainActor in self.handleFix(point, course: course) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let denied = (error as? CLError)?.code == .denied
        Task { @MainActor in self.handleLocationFailure(denied: denied) }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in self.handleAuthorizationChange(status) }
    }
}
