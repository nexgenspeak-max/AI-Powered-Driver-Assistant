import SwiftUI

/// New trip offer: 30 s ring countdown, alert sound + haptic (skipped while voice is active),
/// accept / reject. Dismisses itself when the offer is no longer ours.
struct TripOfferSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(VoiceSession.self) private var voice
    let tripId: String
    static let duration = 30

    @State private var trip: Trip?
    @State private var remaining = TripOfferSheet.duration
    @State private var busy = false
    @State private var startedAt = Date()

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

            GlassEffectContainer(spacing: 12) {
                RatioHStack(weights: [1, 2], spacing: Spacing.s3) {
                    CzenButton(title: "Từ chối", kind: .outline, disabled: busy || trip == nil, identifier: "offer-reject") {
                        act { try await model.rejectTrip(tripId) }
                    }
                    CzenButton(title: "Nhận chuyến", loading: busy, disabled: trip == nil, identifier: "offer-accept") {
                        act { try await model.acceptTrip(tripId) }
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
        .task(id: model.offerRefreshToken) { await load() }
    }

    private func start() async {
        startedAt = Date()
        remaining = Self.duration
        if !voice.isActive {
            model.audio.playOfferAlert()
            Haptics.success()
        }
        await load()
        while !Task.isCancelled {
            try? await Task.sleep(for: .seconds(1))
            let left = Self.duration - Int(Date().timeIntervalSince(startedAt))
            remaining = max(0, left)
            if left <= 0 { dismiss(); return }
        }
    }

    private func load() async {
        do {
            let t = try await model.fetchTrip(tripId)
            trip = t
            let mine = (t.driverPhone ?? "").isEmpty || t.driverPhone == model.phone
            if !(t.status == .notified || t.status == .calling) || !mine { dismiss() }
        } catch APIError.cancelled {
        } catch {}
    }

    private func act(_ op: @escaping () async throws -> Void) {
        busy = true
        Task {
            try? await op()
            busy = false
            dismiss()
        }
    }

    private func dismiss() { if model.offerTripId == tripId { model.offerTripId = nil } }
}
