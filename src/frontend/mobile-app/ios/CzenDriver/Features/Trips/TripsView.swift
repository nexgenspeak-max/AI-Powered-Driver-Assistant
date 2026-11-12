import SwiftUI

enum TripsRoute: Hashable { case addTrip }

enum TripsSegment: Hashable { case pending, active, done }

/// "Chuyến" (dashboard.tsx): greeting, online toggle, search, segments, trip lists.
struct TripsView: View {
    @Environment(AppModel.self) private var model
    @Binding var path: [TripsRoute]
    @State private var segment: TripsSegment = .active
    @State private var query = ""
    @State private var didApplyLaunch = false

    private var pending: [Trip] { model.pendingTrips.filter(matches) }
    private var active: [Trip] { (model.context?.activeTrips ?? []).filter(matches) }
    private var done: [Trip] { (model.context?.completedTrips ?? []).filter(matches) }

    /// Segment-scoped identity: one LazyVStack hosts all three lists, and a trip that moves from
    /// Chờ to Đang chạy must not reuse its pending card.
    private func keyed(_ trips: [Trip], _ scope: String) -> [KeyedTrip] { trips.map { KeyedTrip(id: "\(scope)-\($0.tripId)", trip: $0) } }

    private func matches(_ t: Trip) -> Bool { ViSearch.matches(query, [t.customerName, t.customerPhone]) }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.s4, pinnedViews: [.sectionHeaders]) {
                Section {
                    content
                        .padding(.horizontal, Spacing.gutter)
                } header: {
                    header
                }
            }
            .padding(.bottom, 120)
        }
        .scrollDismissesKeyboard(.immediately)
        .refreshable { await model.loadContext(fresh: true) }
        .screenBackground()
        // The root's title is never shown (bar hidden) but names the pushed screens' back button.
        .navigationTitle("Quay lại")
        .toolbar(.hidden, for: .navigationBar)
        .onAppear {
            guard !didApplyLaunch else { return }
            didApplyLaunch = true
            switch model.config.launch.tripsSegment {
            case "pending": segment = .pending
            case "done": segment = .done
            default: break
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: Spacing.s3) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Xin chào").appText(.label).foregroundStyle(Palette.textSecondary)
                    Text(model.me?.name ?? " ").appText(.h1).foregroundStyle(Palette.textPrimary).lineLimit(1)
                    if let today = model.context?.todayEarnings {
                        Text("Hôm nay \(Fmt.currency(today.totalEarnings)) · \(today.tripCount) chuyến xong")
                            .appText(.caption).foregroundStyle(Palette.textSecondary)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Toggle(isOn: Binding(get: { model.isOnline }, set: { v in Task { await model.setOnline(v) } })) { EmptyView() }
                        .labelsHidden()
                        .tint(Palette.success)
                        .accessibilityLabel("Trạng thái sẵn sàng nhận chuyến")
                        .accessibilityIdentifier("online-toggle")
                    Text(model.isOnline ? "Đang bật" : "Đang tắt").appText(.caption)
                        .foregroundStyle(model.isOnline ? Palette.success : Palette.textMuted)
                }
            }
            HStack(spacing: Spacing.s3) {
                SearchField(placeholder: "Tìm theo tên hoặc số điện thoại...", text: $query)
                Button { path.append(.addTrip) } label: {
                    Image(systemName: "plus").font(.system(size: 20, weight: .semibold)).foregroundStyle(.white)
                        .frame(width: 48, height: 48)
                }
                .buttonStyle(.plain)
                .glassEffect(.regular.tint(Palette.primary).interactive(), in: Circle())
                .accessibilityLabel("Thêm chuyến tự tạo")
                .accessibilityIdentifier("add-trip")
            }
            SegmentedPills(options: [
                (TripsSegment.pending, "Chờ (\(model.pendingTrips.count))"),
                (.active, "Đang chạy (\(model.context?.activeTrips.count ?? 0))"),
                (.done, "Xong (\(model.context?.completedTrips.count ?? 0))"),
            ], selection: $segment, identifierPrefix: "trips-segment")
        }
        .padding(.horizontal, Spacing.gutter)
        .padding(.top, Spacing.s2)
        .padding(.bottom, Spacing.s3)
        .background(Palette.background)
    }

    @ViewBuilder
    private var content: some View {
        if model.me == nil || (model.context == nil && model.contextLoading) || (model.context == nil && !model.contextError) {
            SkeletonBlock(height: 210)
            SkeletonBlock(height: 210)
        } else if model.context == nil && model.contextError {
            EmptyStateView(systemImage: "exclamationmark.circle", title: "Không thể tải chuyến đi",
                           message: "Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.", actionTitle: "Thử lại") {
                Task { await model.loadContext(fresh: true) }
            }
        } else {
            switch segment {
            case .pending:
                if pending.isEmpty { emptyState(totalEmpty: model.pendingTrips.isEmpty) } else {
                    ForEach(keyed(pending, "pending")) { TripCard(trip: $0.trip) }
                }
            case .active:
                if let route = model.context?.optimizedRoute, route.stops.count >= 2, query.isEmpty {
                    OptimizedRouteCard(route: route)
                }
                if active.isEmpty { emptyState(totalEmpty: (model.context?.activeTrips ?? []).isEmpty) } else {
                    ForEach(keyed(active, "active")) { ActiveTripCard(trip: $0.trip) }
                }
            case .done:
                if done.isEmpty {
                    if !query.isEmpty && !(model.context?.completedTrips ?? []).isEmpty {
                        EmptyStateView(systemImage: "magnifyingglass", title: "Không tìm thấy chuyến đi phù hợp")
                    } else {
                        EmptyStateView(systemImage: "checkmark.circle", title: "Chưa có chuyến nào hoàn thành")
                    }
                } else {
                    ForEach(keyed(done, "done")) { ActiveTripCard(trip: $0.trip) }
                }
            }
        }
    }

    @ViewBuilder
    private func emptyState(totalEmpty: Bool) -> some View {
        if !totalEmpty && !query.isEmpty {
            EmptyStateView(systemImage: "magnifyingglass", title: "Không tìm thấy chuyến đi phù hợp")
        } else if model.isOnline {
            EmptyStateView(systemImage: "checkmark.circle", title: "Chưa có chuyến nào", message: "Đang chờ chuyến mới được giao...")
        } else {
            EmptyStateView(systemImage: "power", title: "Bạn đang offline", message: "Bật \"Đang bật\" để bắt đầu nhận chuyến")
        }
    }
}

/// "Thêm chuyến (tự tạo)".
struct AddTripView: View {
    @Environment(AppModel.self) private var model
    @Binding var path: [TripsRoute]
    @State private var phone = ""
    @State private var name = ""
    @State private var pickup = ""
    @State private var dropoff = ""
    @State private var note = ""
    @State private var bulky = false
    @State private var children = false
    @State private var errors: [String: String] = [:]
    @State private var submitting = false
    @State private var failure: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s5) {
                Text("Chuyến sẽ vào ngay Đang chạy — không hiện banner nhận chuyến.")
                    .appText(.body).foregroundStyle(Palette.textSecondary)
                section("Khách hàng") {
                    FormField(label: "Số điện thoại khách", placeholder: "09xxxxxxxx", text: $phone, error: errors["phone"], keyboard: .phonePad, identifier: "addtrip-phone")
                    FormField(label: "Tên khách (nếu có)", placeholder: "Anh/chị…", text: $name, capitalization: .words, identifier: "addtrip-name")
                }
                section("Lộ trình") {
                    FormField(label: "Điểm đón", placeholder: "Số nhà, đường, phường/xã…", text: $pickup, error: errors["pickup"], capitalization: .sentences, identifier: "addtrip-pickup")
                    FormField(label: "Điểm trả", placeholder: "Số nhà, đường, phường/xã…", text: $dropoff, error: errors["dropoff"], capitalization: .sentences, identifier: "addtrip-dropoff")
                    FormField(label: "Ghi chú (nếu có)", placeholder: "", text: $note, capitalization: .sentences, identifier: "addtrip-note")
                }
                section("Yêu cầu đặc biệt") {
                    Toggle("Hàng hoá cồng kềnh", isOn: $bulky).appText(.body).tint(Palette.primary)
                    Divider().overlay(Palette.divider)
                    Toggle("Đi cùng trẻ em", isOn: $children).appText(.body).tint(Palette.primary)
                }
                CzenButton(title: "Thêm chuyến", loading: submitting, identifier: "addtrip-submit") { submit() }
            }
            .padding(Spacing.gutter)
            .padding(.bottom, 100)
        }
        .scrollDismissesKeyboard(.interactively)
        .screenBackground()
        .navigationTitle("Thêm chuyến (tự tạo)")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Không tạo được chuyến", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(failure ?? "") }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder _ content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s2) {
            SectionTitle(text: title)
            VStack(alignment: .leading, spacing: Spacing.s3) { content() }
                .surfaceCard(shadow: false)
        }
    }

    private func submit() {
        var e: [String: String] = [:]
        if phone.trimmingCharacters(in: .whitespaces).isEmpty { e["phone"] = "Vui lòng nhập số điện thoại khách" }
        if pickup.trimmingCharacters(in: .whitespaces).isEmpty { e["pickup"] = "Vui lòng nhập điểm đón" }
        if dropoff.trimmingCharacters(in: .whitespaces).isEmpty { e["dropoff"] = "Vui lòng nhập điểm trả" }
        errors = e
        guard e.isEmpty else { return }
        submitting = true
        let input = CreateTripInput(customerPhone: phone.trimmingCharacters(in: .whitespaces), pickupAddress: pickup.trimmingCharacters(in: .whitespaces),
                                    dropoffAddress: dropoff.trimmingCharacters(in: .whitespaces),
                                    customerName: name.isEmpty ? nil : name, note: note.isEmpty ? nil : note,
                                    hasBulkyGoods: bulky, withChildren: children)
        Task {
            do {
                try await model.createTrip(input)
                path.removeAll()
            } catch {
                failure = (error as? APIError)?.detail ?? "Vui lòng thử lại."
            }
            submitting = false
        }
    }
}

/// Plain form input (radius 12) used by app screens.
struct FormField: View {
    var label: String
    var placeholder: String
    @Binding var text: String
    var error: String?
    var keyboard: UIKeyboardType = .default
    var capitalization: TextInputAutocapitalization = .never
    var readOnly = false
    var identifier: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).appText(.label).foregroundStyle(Palette.textSecondary)
            TextField(placeholder, text: $text)
                .appText(.body)
                .foregroundStyle(readOnly ? Palette.textMuted : Palette.textPrimary)
                .keyboardType(keyboard)
                .textInputAutocapitalization(capitalization)
                .autocorrectionDisabled()
                .disabled(readOnly)
                .padding(.horizontal, 12)
                .frame(minHeight: 48)
                .background(readOnly ? Palette.disabledBackground : Palette.surface, in: RoundedRectangle(cornerRadius: Radius.input, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.input, style: .continuous).strokeBorder(error == nil ? Palette.inputBorder : Palette.danger, lineWidth: 1))
                .accessibilityIdentifier(identifier)
            if let error { Text(error).appText(.caption).foregroundStyle(Palette.danger) }
        }
    }
}

struct KeyedTrip: Identifiable {
    let id: String
    let trip: Trip
}
