import SwiftUI

/// New trip offer: 30 s ring countdown, haptic + alert sound (only the sound is skipped while
/// voice is active), accept / reject. Dismisses itself when the offer is no longer ours; a failed
/// accept / reject keeps the sheet open with an error.
struct TripOfferSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(VoiceSession.self) private var voice
    let tripId: String
    static let duration = 30

    @State private var offer = TripOfferModel(duration: TripOfferSheet.duration)
    @State private var busy = false
    @State private var failure: String?

    /// Never the previous offer's details under a new id.
    private var trip: Trip? { offer.tripId == tripId ? offer.trip : nil }
    private var remaining: Int { offer.tripId == tripId ? offer.remaining : Self.duration }

    var body: some View {
        ScrollView {
        VStack(spacing: Spacing.s4) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Chuyến mới").appText(.h1).foregroundStyle(Palette.textPrimary)
                    Text("Còn \(remaining)s").appText(.label).foregroundStyle(Palette.textSecondary).monospacedDigit()
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark").font(.system(size: 15, weight: .bold)).frame(width: 44, height: 44)
                }
                .buttonStyle(.glass)
                .buttonBorderShape(.circle)
                .accessibilityLabel("Để sau")
                .accessibilityIdentifier("offer-close")
            }
            ZStack {
                Circle().stroke(Palette.ringTrack, lineWidth: 8)
                Circle()
                    .trim(from: 0, to: CGFloat(remaining) / CGFloat(Self.duration))
                    .stroke(Palette.primary, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1), value: remaining)
                VStack(spacing: 2) {
                    Text("Cước ước tính").appText(.caption).foregroundStyle(Palette.textSecondary)
                    Text(trip?.estimatedFare.map { Fmt.currency($0) } ?? "—")
                        .appText(.h2).foregroundStyle(Palette.textPrimary).minimumScaleFactor(0.6).lineLimit(1)
                }
                .padding(.horizontal, 14)
            }
            .frame(width: 132, height: 132)
            .accessibilityElement(children: .combine)

            if let trip {
                VStack(alignment: .leading, spacing: Spacing.s3) {
                    TripMetaRow(trip: trip)
                    HStack(spacing: Spacing.s3) {
                        LetterAvatar(name: trip.displayName, size: 40)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(trip.displayName).appText(.title).foregroundStyle(Palette.textPrimary)
                            if let p = trip.customerPhone { Text(p).appText(.caption).foregroundStyle(Palette.textSecondary) }
                        }
                        Spacer()
                    }
                    RouteLineView(pickup: trip.pickupAddress, dropoff: trip.dropoffAddress)
                }
                .surfaceCard(radius: 20, shadow: false)
            } else {
                SkeletonBlock(height: 180, radius: 20)
            }
            if let failure {
                Label(failure, systemImage: "exclamationmark.triangle.fill")
                    .appText(.label).foregroundStyle(Palette.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .accessibilityIdentifier("offer-error")
            }

            GlassEffectContainer(spacing: 12) {
                RatioHStack(weights: [1, 2], spacing: Spacing.s3) {
                    CzenButton(title: "Từ chối", kind: .outline, disabled: busy || trip == nil, identifier: "offer-reject") {
                        act { try await model.rejectTrip(tripId) }
                    }
                    CzenButton(title: "Nhận chuyến", loading: busy, disabled: trip == nil, identifier: "offer-accept") {
                        act(errorHaptic: true) { try await model.acceptTrip(tripId) }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.gutter)
        .padding(.top, Spacing.s6)
        .padding(.bottom, Spacing.s3)
        }
        .scrollBounceBehavior(.basedOnSize)
        .presentationDetents([.fraction(0.86), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(Radius.sheet)
        .presentationBackgroundInteraction(.disabled)
        .interactiveDismissDisabled(busy)
        .task(id: tripId) { await start() }
        // `trip-offer` invalidations refetch the offer on screen (not on appear: `start` loads it).
        .onChange(of: model.offerRefreshToken) { offer.refresh() }
    }

    private func start() async {
        failure = nil
        Haptics.success() // RN fires the haptic for every offer and skips only the sound
        if !voice.isActive { model.audio.playOfferAlert() }
        let model = self.model
        await offer.run(tripId: tripId, env: TripOfferModel.Env(
            fetch: { try await model.fetchTrip($0) },
            currentOfferId: { model.offerTripId },
            driverPhone: { model.phone },
            dismiss: { id in if model.offerTripId == id { model.offerTripId = nil } }
        ))
    }

    private func act(errorHaptic: Bool = false, _ op: @escaping () async throws -> Void) {
        guard !busy else { return }
        busy = true
        failure = nil
        Task {
            let result = await TripOfferLogic.run(op)
            busy = false
            switch result {
            case .dismiss: dismiss()
            case let .stay(message):
                if errorHaptic { Haptics.error() } // TripOfferSheet.tsx: accept onError
                failure = message
            }
        }
    }

    private func dismiss() { if model.offerTripId == tripId { model.offerTripId = nil } }
}

/// The offer on screen: countdown and trip load, kept out of the view so they can be unit-tested.
/// The countdown never depends on the load (`TripOfferSheet.tsx`): the sheet always closes when
/// it expires, and the load stops retrying then.
@MainActor
@Observable
final class TripOfferModel {
    struct Env {
        var fetch: (String) async throws -> Trip
        /// The offer the app currently presents (`AppModel.offerTripId`).
        var currentOfferId: () -> String?
        var driverPhone: () -> String?
        /// Closes the sheet if it still shows this offer.
        var dismiss: (String) -> Void
    }

    private(set) var tripId: String?
    private(set) var trip: Trip?
    private(set) var remaining: Int

    @ObservationIgnored private let duration: Int
    /// Length of one countdown unit (tests shrink it).
    @ObservationIgnored private let second: Duration
    @ObservationIgnored private let maxRetries: Int
    @ObservationIgnored private let retryDelay: (Int) -> Duration
    @ObservationIgnored private var env: Env?
    @ObservationIgnored private var refreshTask: Task<Void, Never>?

    init(duration: Int, second: Duration = .seconds(1), maxRetries: Int = 3,
         retryDelay: @escaping (Int) -> Duration = TripOfferLogic.retryDelay) {
        self.duration = duration
        self.second = second
        self.maxRetries = maxRetries
        self.retryDelay = retryDelay
        remaining = duration
    }

    /// One offer's lifetime (the view's `.task(id: tripId)`): loads the trip while the countdown
    /// runs, closes the sheet at zero. Returns when the countdown expired or the task was cancelled.
    func run(tripId id: String, env: Env) async {
        refreshTask?.cancel()
        refreshTask = nil
        self.env = env
        tripId = id
        trip = nil
        remaining = duration
        let loader = Task { await self.load(id, retrying: true) }
        defer {
            loader.cancel() // no retries once the countdown is over or the offer changed
            refreshTask?.cancel()
        }
        let started = ContinuousClock.now
        while !Task.isCancelled {
            try? await Task.sleep(for: second)
            guard !Task.isCancelled, tripId == id else { return }
            let left = duration - Int((ContinuousClock.now - started) / second)
            remaining = max(0, left)
            if left <= 0 { env.dismiss(id); return }
        }
    }

    /// A `trip-offer` invalidation: one more fetch for the offer on screen (no retries).
    func refresh() {
        guard let id = tripId else { return }
        refreshTask?.cancel()
        refreshTask = Task { await self.load(id, retrying: false) }
    }

    private func load(_ id: String, retrying: Bool) async {
        guard let env else { return }
        var attempt = 0
        while !Task.isCancelled {
            let result = await TripOfferLogic.fetch(id, using: env.fetch)
            // A response for an offer that was replaced meanwhile must not be shown under the new id.
            guard !Task.isCancelled, tripId == id, env.currentOfferId() == id else { return }
            switch result {
            case let .loaded(t):
                trip = t
                if !TripOfferLogic.isStillOffered(t, driverPhone: env.driverPhone()) { env.dismiss(id) }
                return
            case .cancelled:
                return
            case let .failed(transient):
                guard retrying, transient, attempt < maxRetries else { return }
                attempt += 1
                try? await Task.sleep(for: retryDelay(attempt))
            }
        }
    }
}

/// The sheet's decisions, kept out of the view so they can be unit-tested.
enum TripOfferLogic {
    enum Outcome: Equatable { case dismiss, stay(message: String) }
    enum Fetch: Equatable { case loaded(Trip), cancelled, failed(transient: Bool) }

    /// The sheet closes only when the request succeeded; a failure keeps it open with a message.
    @MainActor
    static func run(_ op: () async throws -> Void) async -> Outcome {
        do {
            try await op()
            return .dismiss
        } catch {
            return .stay(message: TripActionFailure.text(for: error))
        }
    }

    @MainActor
    static func fetch(_ id: String, using fetchTrip: (String) async throws -> Trip) async -> Fetch {
        do { return .loaded(try await fetchTrip(id)) } catch APIError.cancelled { return .cancelled } catch is CancellationError { return .cancelled } catch { return .failed(transient: isTransient(error)) }
    }

    static func isStillOffered(_ trip: Trip, driverPhone: String?) -> Bool {
        let mine = (trip.driverPhone ?? "").isEmpty || trip.driverPhone == driverPhone
        return (trip.status == .notified || trip.status == .calling) && mine
    }

    /// Worth retrying: no connection, 5xx, 408 / 429. A 404 (offer cancelled or reassigned) and
    /// other client errors are final.
    static func isTransient(_ error: Error) -> Bool {
        switch error as? APIError {
        case .network: return true
        case let .http(status, _): return status >= 500 || status == 408 || status == 429
        default: return false
        }
    }

    static func retryDelay(attempt: Int) -> Duration { .seconds(min(max(attempt, 1), 3)) }
}
