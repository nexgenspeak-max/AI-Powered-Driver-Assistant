import SwiftUI

/// Distance, ETA, pickup time and traffic note (warning colour unless "thông thoáng").
struct TripMetaRow: View {
    var trip: Trip
    var body: some View {
        let note = trip.trafficNote ?? ""
        let clear = ViSearch.fold(note).contains("thong thoang")
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: Spacing.s3) {
                if let km = trip.distanceKm, km > 0 { meta("point.topleft.down.to.point.bottomright.curvepath", Fmt.km(km)) }
                if let eta = trip.etaMinutes, eta > 0 { meta("clock", Fmt.minutes(eta)) }
                if let time = trip.pickupTime, !time.isEmpty { meta("calendar", Fmt.time(time)) }
            }
            if !note.isEmpty {
                Label(note, systemImage: clear ? "checkmark.circle" : "exclamationmark.triangle")
                    .appText(.caption)
                    .foregroundStyle(clear ? Palette.textSecondary : Palette.warning)
            }
        }
    }

    private func meta(_ icon: String, _ text: String) -> some View {
        Label(text, systemImage: icon)
            .appText(.caption)
            .foregroundStyle(Palette.textSecondary)
            .labelStyle(.titleAndIcon)
            .lineLimit(1)
    }
}

/// Đã nhận → Đã đến → Đã đón.
struct TripProgressStepper: View {
    var status: TripStatus
    private var reached: Int {
        switch status {
        case .confirmed: 1
        case .arrivedPickup: 2
        case .pickedUp, .completed: 3
        default: 0
        }
    }

    var body: some View {
        let labels = ["Đã nhận", "Đã đến", "Đã đón"]
        HStack(spacing: 0) {
            ForEach(0..<3, id: \.self) { i in
                let done = i < reached
                VStack(spacing: 6) {
                    ZStack {
                        Circle().fill(done ? Palette.primary : Palette.surfaceVariant).frame(width: 24, height: 24)
                        if done { Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(.white) }
                        else { Text("\(i + 1)").appText(.caption).foregroundStyle(Palette.textMuted) }
                    }
                    Text(labels[i]).appText(.caption).foregroundStyle(done ? Palette.textPrimary : Palette.textMuted)
                }
                .frame(maxWidth: .infinity)
                if i < 2 {
                    Capsule().fill(i + 1 < reached ? Palette.primary : Palette.surfaceVariant).frame(height: 3).frame(maxWidth: .infinity).padding(.bottom, 20)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Tiến trình: \(reached)/3 — \(status.label)")
    }
}

private struct CustomerHeader: View {
    var trip: Trip
    var trailing: AnyView
    var body: some View {
        HStack(spacing: Spacing.s3) {
            LetterAvatar(name: trip.displayName, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                Text(trip.displayName).appText(.title).foregroundStyle(Palette.textPrimary).lineLimit(1)
                if let phone = trip.customerPhone { Text(phone).appText(.caption).foregroundStyle(Palette.textSecondary) }
            }
            Spacer(minLength: 0)
            trailing
        }
    }
}

/// Pending trip card (Chờ tab).
struct TripCard: View {
    @Environment(AppModel.self) private var model
    var trip: Trip
    @State private var confirmReject = false
    @State private var busy = false

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s3) {
            CustomerHeader(trip: trip, trailing: AnyView(
                VStack(alignment: .trailing, spacing: 6) {
                    StatusBadge(status: trip.status)
                    if let fare = trip.estimatedFare { Text(Fmt.currency(fare)).appText(.bodyStrong).foregroundStyle(Palette.textPrimary) }
                }
            ))
            RouteLineView(pickup: trip.pickupAddress, dropoff: trip.dropoffAddress)
            TripMetaRow(trip: trip)
            if trip.status == .notified || trip.status == .calling {
                HStack(spacing: Spacing.s3) {
                    CzenButton(title: "Từ chối", kind: .outline, disabled: busy) { confirmReject = true }
                    CzenButton(title: "Nhận chuyến", loading: busy, identifier: "accept-\(trip.tripId)") {
                        busy = true
                        Task { try? await model.acceptTrip(trip.tripId); busy = false }
                    }
                }
            }
        }
        .surfaceCard()
        .confirmationDialog("Từ chối chuyến này?", isPresented: $confirmReject, titleVisibility: .visible) {
            Button("Từ chối", role: .destructive) { Task { try? await model.rejectTrip(trip.tripId) } }
            Button("Giữ lại", role: .cancel) {}
        } message: {
            Text("Bạn sẽ không thể nhận lại chuyến này sau khi từ chối.")
        }
    }
}

/// Active / completed trip card with stepper and next action.
struct ActiveTripCard: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    var trip: Trip
    @State private var confirmCancel = false
    @State private var busy = false
    @State private var failure: String?

    private var nextAction: (String, CzenButton.Kind)? {
        switch trip.status {
        case .confirmed: ("Đã đến điểm đón", .primary)
        case .arrivedPickup: ("Đã đón khách", .primary)
        case .pickedUp: ("Hoàn thành chuyến", .success)
        case .completed: ("Đã hoàn thành", .outline)
        default: nil
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s3) {
            CustomerHeader(trip: trip, trailing: AnyView(
                VStack(alignment: .trailing, spacing: 6) {
                    StatusBadge(status: trip.status)
                    if let fare = trip.estimatedFare { Text(Fmt.currency(fare)).appText(.bodyStrong).foregroundStyle(Palette.textPrimary) }
                }
            ))
            TripProgressStepper(status: trip.status)
            RouteLineView(pickup: trip.pickupAddress, dropoff: trip.dropoffAddress)
            TripMetaRow(trip: trip)
            let flags = [trip.hasBulkyGoods == true ? "Hàng cồng kềnh" : nil, trip.withChildren == true ? "Có trẻ em" : nil].compactMap { $0 }
            if !flags.isEmpty {
                Label(flags.joined(separator: " · "), systemImage: "info.circle")
                    .appText(.caption).foregroundStyle(Palette.info)
            }
            if let action = nextAction {
                CzenButton(title: LocalizedStringKey(action.0), kind: action.1, loading: busy, disabled: trip.status == .completed, identifier: "advance-\(trip.tripId)") {
                    advance()
                }
            }
            if trip.status != .completed {
                HStack(spacing: Spacing.s3) {
                    CzenButton(title: "Gọi khách", kind: .outline, systemImage: "phone.fill") {
                        if let phone = trip.customerPhone, let url = URL(string: "tel:\(phone)") { openURL(url) }
                    }
                    if trip.status != .pickedUp {
                        CzenButton(title: "Huỷ chuyến", kind: .outline) { confirmCancel = true }
                    }
                }
            }
        }
        .surfaceCard()
        .confirmationDialog("Huỷ chuyến này?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Huỷ chuyến", role: .destructive) { Task { try? await model.cancelTrip(trip.tripId) } }
            Button("Giữ chuyến", role: .cancel) {}
        } message: {
            Text("Khách sẽ được thông báo. Thao tác này không thể hoàn tác.")
        }
        .alert("Chưa thể xác nhận", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(failure ?? "")
        }
    }

    private func advance() {
        busy = true
        Task {
            do {
                try await model.advance(trip)
            } catch let error as APIError {
                if error.status == 409 { failure = error.detail ?? "Không thể xác nhận, vui lòng thử lại." }
                else { failure = "Không thể xác nhận, vui lòng thử lại." }
            } catch {
                failure = "Không thể xác nhận, vui lòng thử lại."
            }
            busy = false
        }
    }
}

/// "Lộ trình tối ưu" — collapsed by default, hidden under 2 stops.
struct OptimizedRouteCard: View {
    var route: OptimizedRoute
    @State private var expanded = false

    var body: some View {
        let stops = route.stops
        let totalKm = (route.totalDistanceM ?? stops.reduce(0) { $0 + ($1.distanceM ?? 0) }) / 1000
        let totalMin = route.totalDurationS.map { $0 / 60 } ?? stops.reduce(0) { $0 + ($1.etaMinutes ?? 0) }
        let basis = route.costBasis == "duration" ? "nhanh nhất theo giao thông" : "ngắn nhất"
        VStack(alignment: .leading, spacing: Spacing.s3) {
            HStack(spacing: Spacing.s3) {
                Image(systemName: "point.topright.arrow.triangle.backward.to.point.bottomleft.scurvepath.fill")
                    .foregroundStyle(.white).frame(width: 36, height: 36).background(Palette.cta, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Lộ trình tối ưu").appText(.title).foregroundStyle(Palette.textPrimary)
                    Text("\(stops.count) điểm · \(Fmt.km(totalKm)) · ~\(Fmt.minutes(totalMin)) · \(basis)")
                        .appText(.caption).foregroundStyle(Palette.textSecondary)
                }
            }
            if route.source == "haversine_fallback" {
                Text("Ước tính đường chim bay — chưa có dữ liệu giao thông thực tế")
                    .appText(.caption).foregroundStyle(Palette.warning)
            }
            let shown = expanded ? stops : Array(stops.prefix(2))
            VStack(alignment: .leading, spacing: Spacing.s3) {
                ForEach(Array(shown.enumerated()), id: \.offset) { index, stop in
                    HStack(alignment: .top, spacing: Spacing.s3) {
                        Text("\(index + 1)").appText(.label).fontWeight(.bold).foregroundStyle(.white)
                            .frame(width: 26, height: 26)
                            .background(Palette.tripColors[index % Palette.tripColors.count], in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text("\(stop.isPickup ? "Đón" : "Trả") \(stop.customerName ?? "Khách")").appText(.bodyStrong).foregroundStyle(Palette.textPrimary)
                            Text(stop.address).appText(.caption).foregroundStyle(Palette.textSecondary)
                            if index == 0 && route.driverLocation == nil {
                                Text("Điểm xuất phát (chưa có GPS)").appText(.caption).foregroundStyle(Palette.textMuted)
                            } else if let d = stop.distanceM {
                                Text("\(Fmt.km(d / 1000)) · \(Fmt.minutes(stop.etaMinutes))").appText(.caption).foregroundStyle(Palette.textMuted)
                            }
                        }
                    }
                }
            }
            if stops.count > 2 {
                Button { withAnimation(.snappy) { expanded.toggle() } } label: {
                    Label(expanded ? "Thu gọn" : "Xem cả \(stops.count) điểm", systemImage: expanded ? "chevron.up" : "chevron.down")
                        .appText(.label).foregroundStyle(Palette.primary).frame(minHeight: 44)
                }
            }
        }
        .surfaceCard()
    }
}
