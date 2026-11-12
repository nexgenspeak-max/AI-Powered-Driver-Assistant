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

    init(api: DriverAPI, demo: Bool) {
        self.api = api
        self.demo = demo
        super.init()
        if demo {
            current = LatLng(lat: 21.0333, lng: 105.8200)
            authorization = .authorizedWhenInUse
        } else {
            manager.delegate = self
            manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
            manager.distanceFilter = 5
            manager.activityType = .automotiveNavigation
            authorization = manager.authorizationStatus
        }
    }

    /// Foreground watch (3 s / 5 m) plus a 15 s wall-clock tick that refreshes a fix older than 10 s.
    func startForeground() {
        foregroundActive = true
        guard !demo else { return }
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
        guard !demo else { return }
        manager.stopUpdatingLocation()
    }

    /// Background tracking while online; asks for Always authorisation in context.
    func setBackgroundTracking(_ on: Bool) {
        backgroundTracking = on
        guard !demo else { return }
        if on {
            if manager.authorizationStatus == .authorizedWhenInUse { manager.requestAlwaysAuthorization() }
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
        manager.requestLocation()
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

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorization = status
            if self.foregroundActive, status == .authorizedWhenInUse || status == .authorizedAlways { self.manager.startUpdatingLocation() }
            if self.backgroundTracking { self.manager.allowsBackgroundLocationUpdates = status == .authorizedAlways }
        }
    }
}
