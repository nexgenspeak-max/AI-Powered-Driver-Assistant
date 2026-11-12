import SwiftUI

/// Next stop: first optimized stop, else the current trip's pickup (dropoff once picked up).
struct NextStop: Equatable {
    var tripId: String
    var name: String
    var address: String
    var coordinate: LatLng
    var isPickup: Bool
    var arrived: Bool
    var phone: String?
    var index: Int
    var total: Int
    var serverDistanceM: Double?
    var serverEtaMin: Double?

    var label: String {
        let base = isPickup ? (arrived ? "Đã đến · chờ khách" : "Đón khách") : "Trả khách"
        return total > 1 ? "\(base) · \(index)/\(total) điểm" : base
    }

    @MainActor
    static func from(_ ctx: DriverContext?) -> NextStop? {
        guard let ctx else { return nil }
        if let route = ctx.optimizedRoute, let first = route.stops.first {
            let trip = ctx.activeTrips.first { $0.tripId == first.tripId }
            return NextStop(tripId: first.tripId, name: first.customerName ?? trip?.displayName ?? "Khách", address: first.address,
                            coordinate: first.coordinate, isPickup: first.isPickup, arrived: trip?.status == .arrivedPickup,
                            phone: trip?.customerPhone, index: 1, total: route.stops.count,
                            serverDistanceM: first.distanceM, serverEtaMin: first.etaMinutes)
        }
        guard let trip = ctx.currentTrip ?? ctx.activeTrips.first else { return nil }
        let pickup = trip.status != .pickedUp
        guard let coord = pickup ? trip.pickup : trip.dropoff else { return nil }
        return NextStop(tripId: trip.tripId, name: trip.displayName, address: pickup ? trip.pickupAddress : trip.dropoffAddress,
                        coordinate: coord, isPickup: pickup, arrived: trip.status == .arrivedPickup, phone: trip.customerPhone,
                        index: 1, total: 1, serverDistanceM: trip.distanceKm.map { $0 * 1000 }, serverEtaMin: trip.etaMinutes)
    }
}

/// Home: full-bleed map with status pill, recenter, NextStopCard / GoOnlineCard and the HUD.
struct HomeView: View {
    @Environment(AppModel.self) private var model
    @Environment(LocationTracker.self) private var location
    @Binding var selection: AppTab
    @State private var recenterToken = 0
    @State private var didAutoNavigate = false
    @Namespace private var glass

    private var nav: TurnByTurn { model.navigation }

    var body: some View {
        let next = NextStop.from(model.context)
        ZStack {
            DriverMapView(styleURL: model.config.mapStyleURL, scene: scene(next: next))
                .ignoresSafeArea()
                .accessibilityIdentifier("home-map")
            LinearGradient(colors: [.black.opacity(0.35), .clear], startPoint: .top, endPoint: .bottom)
                .frame(height: 120)
                .frame(maxHeight: .infinity, alignment: .top)
                .ignoresSafeArea()
                .allowsHitTesting(false)
            overlays(next: next)
        }
        .onChange(of: location.current) {
            if let here = location.current { nav.update(position: here) }
        }
        .task {
            guard model.config.launch.navigate, !didAutoNavigate else { return }
            didAutoNavigate = true
            try? await Task.sleep(for: .milliseconds(800))
            if let next = NextStop.from(model.context) { await startNavigation(to: next) }
        }
    }

    private func scene(next: NextStop?) -> MapScene {
        var s = MapScene()
        s.driver = location.current
        let ctx = model.context
        if let route = ctx?.optimizedRoute {
            var colorIndex: [String: Int] = [:]
            s.stops = route.stops.enumerated().map { i, stop in
                let c = colorIndex[stop.tripId] ?? colorIndex.count
                colorIndex[stop.tripId] = c
                return .init(id: "\(stop.tripId)-\(stop.kind)", coordinate: stop.coordinate, pickup: stop.isPickup,
                             name: stop.customerName ?? "Khách", order: i + 1, colorHex: Palette.tripColorHex[c % Palette.tripColorHex.count])
            }
            s.routePath = (route.path?.isEmpty == false) ? route.path! : ([location.current].compactMap { $0 } + route.stops.map(\.coordinate))
        } else if let trips = ctx?.activeTrips {
            var order = 0
            s.stops = trips.enumerated().flatMap { i, t -> [MapScene.Stop] in
                var out: [MapScene.Stop] = []
                let color = Palette.tripColorHex[i % Palette.tripColorHex.count]
                if t.status != .pickedUp, let p = t.pickup { order += 1; out.append(.init(id: "\(t.tripId)-pickup", coordinate: p, pickup: true, name: t.displayName, order: order, colorHex: color)) }
                if let d = t.dropoff { order += 1; out.append(.init(id: "\(t.tripId)-dropoff", coordinate: d, pickup: false, name: t.displayName, order: order, colorHex: color)) }
                return out
            }
        }
        if nav.isNavigating { s.navPath = nav.path }
        if nav.isNavigating, let here = location.current {
            s.camera = .navigate(here, bearing: location.course)
        } else if let here = location.current {
            s.camera = .follow(here)
        } else {
            s.camera = .fit(s.stops.map(\.coordinate))
        }
        s.recenterToken = recenterToken
        return s
    }

    @ViewBuilder
    private func overlays(next: NextStop?) -> some View {
        VStack(spacing: 0) {
            if nav.isNavigating {
                NavigationHud(nav: nav, position: location.current) {
                    Task { await nav.retry(from: location.current) }
                } onClose: { nav.stop() }
                .padding(.horizontal, Spacing.s4)
                .padding(.top, Spacing.s2)
                .environment(\.colorScheme, .light)
            } else {
                GlassEffectContainer(spacing: 16) {
                    HStack(alignment: .top) {
                        MapStatusPill(online: model.isOnline, trips: model.context?.activeTrips.count ?? 0)
                            .glassEffectID("pill", in: glass)
                        Spacer()
                        Button { recenterToken += 1 } label: {
                            Image(systemName: "location.fill").font(.system(size: 18, weight: .semibold)).foregroundStyle(Palette.primary)
                                .frame(width: 48, height: 48)
                        }
                        .buttonStyle(.plain)
                        .glassEffect(.regular.interactive(), in: Circle())
                        .glassEffectID("recenter", in: glass)
                        .accessibilityLabel("Về vị trí của tôi")
                        .accessibilityIdentifier("recenter")
                    }
                }
                .padding(.horizontal, Spacing.s4)
                .padding(.top, Spacing.s2)
                // Goong tiles are light in both themes, so the floating glass reads as light glass.
                .environment(\.colorScheme, .light)
            }
            Spacer()
            if !nav.isNavigating {
                if let next {
                    NextStopCard(stop: next, live: location.current, routeOrigin: model.context?.optimizedRoute?.driverLocation) {
                        Task { await startNavigation(to: next) }
                    }
                    .padding(.horizontal, Spacing.s4)
                } else if model.context != nil && !model.isOnline {
                    GoOnlineCard(today: model.context?.todayEarnings) { Task { await model.setOnline(true) } }
                        .padding(.horizontal, Spacing.s4)
                }
            }
        }
        .padding(.bottom, 96)
        .animation(.spring(duration: 0.35), value: nav.isNavigating)
    }

    private func startNavigation(to next: NextStop) async {
        Task { await location.pushImmediate() }
        await nav.start(from: location.current, to: next.coordinate)
    }
}

struct MapStatusPill: View {
    var online: Bool
    var trips: Int
    var body: some View {
        HStack(spacing: 8) {
            Circle().fill(online ? Palette.success : Palette.textMuted).frame(width: 9, height: 9)
                .shadow(color: online ? Palette.success.opacity(0.7) : .clear, radius: 4)
            Text(online ? "Đang nhận chuyến" : "Đang nghỉ").appText(.label).fontWeight(.semibold).foregroundStyle(Palette.textPrimary)
            if trips > 0 { Text("· \(trips) chuyến").appText(.label).foregroundStyle(Palette.textSecondary) }
        }
        .padding(.horizontal, 14)
        .frame(height: 44)
        .glassEffect(.regular, in: Capsule())
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("status-pill")
    }
}

struct NextStopCard: View {
    @Environment(\.openURL) private var openURL
    var stop: NextStop
    var live: LatLng?
    var routeOrigin: LatLng?
    var onNavigate: () -> Void

    var body: some View {
        let leg = LiveLeg.compute(serverDistanceM: stop.serverDistanceM, serverEtaMin: stop.serverEtaMin, routeOrigin: routeOrigin, live: live, stop: stop.coordinate)
        VStack(alignment: .leading, spacing: Spacing.s3) {
            HStack(spacing: 8) {
                Image(systemName: stop.isPickup ? "mappin.circle.fill" : "flag.checkered.circle.fill").foregroundStyle(Palette.primary)
                Text(stop.label).appText(.label).fontWeight(.semibold).foregroundStyle(Palette.primary)
            }
            HStack(alignment: .firstTextBaseline) {
                Text(stop.name).appText(.h2).foregroundStyle(Palette.textPrimary).lineLimit(1)
                Spacer()
                Text([Fmt.minutes(leg.etaMinutes), Fmt.km(leg.distanceKm)].filter { !$0.isEmpty }.joined(separator: " · "))
                    .appText(.label).foregroundStyle(Palette.textSecondary).monospacedDigit()
            }
            Text(stop.address).appText(.body).foregroundStyle(Palette.textSecondary).lineLimit(2)
            GlassEffectContainer(spacing: 12) {
                HStack(spacing: Spacing.s3) {
                    CzenButton(title: "Chỉ đường", systemImage: "location.north.line.fill", identifier: "start-navigation", action: onNavigate)
                    Button {
                        if let phone = stop.phone, let url = URL(string: "tel:\(phone)") { openURL(url) }
                    } label: {
                        Image(systemName: "phone.fill").font(.system(size: 19, weight: .semibold)).foregroundStyle(Palette.success).frame(width: 52, height: 52)
                    }
                    .buttonStyle(.plain)
                    .glassEffect(.regular.tint(Palette.success.opacity(0.2)).interactive(), in: Circle())
                    .accessibilityLabel("Gọi \(stop.name)")
                }
            }
        }
        .padding(Spacing.s4)
        .background(Palette.surfaceElevated, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .shadow(color: .black.opacity(0.22), radius: 20, y: 8)
        .accessibilityElement(children: .contain).accessibilityIdentifier("next-stop-card")
    }
}

struct GoOnlineCard: View {
    var today: TodayEarnings?
    var onGoOnline: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s2) {
            Text("Hôm nay").appText(.label).foregroundStyle(Palette.textSecondary)
            Text(Fmt.currency(today?.totalEarnings ?? 0)).appText(.display).foregroundStyle(Palette.textPrimary)
            Text("\(today?.tripCount ?? 0) chuyến").appText(.body).foregroundStyle(Palette.textSecondary)
            CzenButton(title: "Bật nhận chuyến", systemImage: "power", identifier: "go-online", action: onGoOnline).padding(.top, Spacing.s2)
        }
        .padding(Spacing.s4)
        .background(Palette.surfaceElevated, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .shadow(color: .black.opacity(0.22), radius: 20, y: 8)
    }
}

struct NavigationHud: View {
    var nav: TurnByTurn
    var position: LatLng?
    var onRetry: () -> Void
    var onClose: () -> Void

    var body: some View {
        HStack(alignment: .center, spacing: Spacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 52, height: 52)
                .background(Color(hex: 0x2563EB), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).appText(.h2).foregroundStyle(Palette.textPrimary).lineLimit(2)
                if let subtitle { Text(subtitle).appText(.label).foregroundStyle(Palette.textSecondary) }
            }
            Spacer(minLength: 0)
            if nav.state == .error {
                Button(action: onRetry) { Image(systemName: "arrow.clockwise").frame(width: 44, height: 44) }
                    .buttonStyle(.glass).buttonBorderShape(.circle)
                    .accessibilityLabel("Tính lại đường đi")
            }
            Button(action: onClose) { Image(systemName: "xmark").font(.system(size: 15, weight: .bold)).frame(width: 44, height: 44) }
                .buttonStyle(.glass).buttonBorderShape(.circle)
                .accessibilityLabel("Thoát chỉ đường")
                .accessibilityIdentifier("nav-close")
        }
        .padding(Spacing.s3)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .accessibilityElement(children: .contain).accessibilityIdentifier("navigation-hud")
    }

    private var icon: String {
        switch nav.state {
        case .arrived: return "checkmark"
        case .error: return "exclamationmark.triangle.fill"
        case .loading, .idle: return "arrow.triangle.turn.up.right.diamond.fill"
        case .active:
            let m = (nav.currentStep?.maneuver ?? "").lowercased()
            if m.contains("uturn") { return "arrow.uturn.down" }
            if m.contains("roundabout") { return "arrow.triangle.capsulepath" }
            if m.contains("merge") { return "arrow.merge" }
            if m.contains("left") { return "arrow.turn.up.left" }
            if m.contains("right") { return "arrow.turn.up.right" }
            return "arrow.up"
        }
    }

    private var title: String {
        switch nav.state {
        case .loading, .idle: return "Đang tính đường..."
        case .error: return "Không lấy được chỉ đường"
        case .arrived: return "Đã đến nơi"
        case .active:
            guard let step = nav.currentStep else { return "Đã đến nơi" }
            let dist = position.map { min(step.distanceM, Geo.distanceMeters($0, step.endLocation)) } ?? step.distanceM
            return NavigationMath.instruction(maneuver: step.maneuver, distanceM: dist)
        }
    }

    private var subtitle: String? {
        guard nav.state == .active else { return nil }
        if nav.rerouting { return "Đang tính lại đường..." }
        guard let r = nav.remaining(from: position) else { return nil }
        return "Còn \(Fmt.km(r.km)) · \(Fmt.minutes(r.min))"
    }
}
