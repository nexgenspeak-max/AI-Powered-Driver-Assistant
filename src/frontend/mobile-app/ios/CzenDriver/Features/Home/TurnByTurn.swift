import Foundation
import Observation

/// Turn-by-turn navigation (`useTurnByTurnNavigation.ts`): fetch once per destination, advance
/// steps, re-route when off-route (50 m × 3 ticks, ≤ 1 per 20 s), "Đã đến nơi" for 4 s.
@MainActor
@Observable
final class TurnByTurn {
    enum State: Equatable { case idle, loading, error, active, arrived }

    private(set) var state: State = .idle
    private(set) var route: NavigationRoute?
    private(set) var path: [LatLng] = []
    private(set) var stepIndex = 0
    private(set) var rerouting = false
    private(set) var destination: LatLng?

    @ObservationIgnored private let api: DriverAPI
    @ObservationIgnored private var offTicks = 0
    @ObservationIgnored private var lastRerouteAt: TimeInterval = 0
    @ObservationIgnored private var arrivedTask: Task<Void, Never>?
    @ObservationIgnored var now: () -> TimeInterval = { Date().timeIntervalSince1970 }

    init(api: DriverAPI) { self.api = api }

    var isNavigating: Bool { state != .idle }

    var currentStep: RouteStep? {
        guard let steps = route?.steps, stepIndex < steps.count else { return nil }
        return steps[stepIndex]
    }

    func start(from origin: LatLng?, to destination: LatLng) async {
        self.destination = destination
        stepIndex = 0
        offTicks = 0
        state = .loading
        await fetch(from: origin ?? destination)
    }

    func retry(from origin: LatLng?) async {
        guard let destination else { return }
        state = .loading
        await fetch(from: origin ?? destination)
        _ = destination
    }

    func stop() {
        arrivedTask?.cancel()
        state = .idle
        route = nil
        path = []
        destination = nil
        rerouting = false
    }

    private func fetch(from origin: LatLng) async {
        guard let destination else { return }
        do {
            let r = try await api.navigation(from: origin, to: destination)
            route = r
            path = Geo.decodePolyline(r.polyline)
            stepIndex = 0
            if state != .idle { state = .active }
        } catch {
            if state != .idle && !rerouting { state = .error }
        }
        rerouting = false
    }

    /// One GPS tick.
    func update(position: LatLng) {
        guard state == .active, let route else { return }
        stepIndex = NavigationMath.advanceStepIndex(origin: position, steps: route.steps, from: stepIndex)
        if stepIndex >= route.steps.count || (destination.map { Geo.distanceMeters(position, $0) <= NavigationMath.arrivalThresholdM } ?? false) {
            arrive()
            return
        }
        let tick = NavigationMath.offRouteTick(origin: position, path: path, ticksSoFar: offTicks, lastRerouteAt: lastRerouteAt, now: now())
        offTicks = tick.ticks
        if tick.shouldReroute {
            lastRerouteAt = now()
            offTicks = 0
            rerouting = true
            Task { await fetch(from: position) }
        }
    }

    func remaining(from position: LatLng?) -> (km: Double, min: Double)? {
        guard let route else { return nil }
        return NavigationMath.remaining(origin: position, steps: route.steps, stepIndex: stepIndex)
    }

    private func arrive() {
        state = .arrived
        arrivedTask?.cancel()
        arrivedTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            if !Task.isCancelled { self?.stop() }
        }
    }
}
