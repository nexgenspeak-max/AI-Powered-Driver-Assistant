import SwiftUI

enum ProfileRoute: String, Hashable {
    case editProfile = "edit-profile", vehicle, assistantSettings = "assistant-settings", bankInfo = "bank-info"
    case documents, safety, support, terms, about, faq
}

struct ProfileDestination: View {
    var route: ProfileRoute
    @Binding var path: [ProfileRoute]
    var body: some View {
        switch route {
        case .editProfile: EditProfileView()
        case .vehicle: VehicleView()
        case .assistantSettings: AssistantSettingsView()
        case .bankInfo: BankInfoView()
        case .documents: DocumentsView()
        case .safety: SafetyView()
        case .support: SupportView(path: $path)
        case .terms: TermsView()
        case .about: AboutView()
        case .faq: FaqView()
        }
    }
}

/// "Cá nhân": profile card, stats and menus.
struct ProfileView: View {
    @Environment(AppModel.self) private var model
    @Binding var path: [ProfileRoute]
    @State private var confirmLogout = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s5) {
                Text("Cá nhân").appText(.h1).foregroundStyle(Palette.textPrimary).accessibilityAddTraits(.isHeader)
                profileCard
                if model.contextError && model.context == nil {
                    VStack(spacing: Spacing.s2) {
                        Text("Không thể tải thông tin hồ sơ.").appText(.body).foregroundStyle(Palette.textSecondary)
                        Button("Thử lại") { Task { await model.loadContext(fresh: true) } }.buttonStyle(.glass)
                    }
                    .frame(maxWidth: .infinity)
                }
                menu("Tài khoản", [
                    (ProfileRoute.editProfile, "person.crop.circle", "Chỉnh sửa hồ sơ"),
                    (.vehicle, "car.fill", "Quản lý xe"),
                ])
                menu("Thanh toán & Giấy tờ", [
                    (.bankInfo, "creditcard.fill", "Tài khoản ngân hàng"),
                    (.documents, "doc.text.fill", "Giấy tờ xác minh"),
                ])
                menu("Hỗ trợ & Pháp lý", [
                    (.safety, "checkmark.shield.fill", "Trung tâm an toàn"),
                    (.support, "questionmark.bubble.fill", "Hỗ trợ"),
                    (.terms, "doc.plaintext.fill", "Điều khoản & Chính sách bảo mật"),
                ])
                VStack(alignment: .leading, spacing: Spacing.s2) {
                    SectionTitle(text: "Cài đặt")
                    VStack(spacing: 0) {
                        NavigationLink(value: ProfileRoute.assistantSettings) { MenuRow(systemImage: "waveform", title: "Cài đặt trợ lý") }
                            .accessibilityIdentifier("menu-assistant-settings")
                        Divider().overlay(Palette.divider).padding(.leading, 46)
                        HStack {
                            MenuRow(systemImage: "moon.fill", title: "Chế độ tối", showsChevron: false)
                            ThemeToggle()
                        }
                        Divider().overlay(Palette.divider).padding(.leading, 46)
                        NavigationLink(value: ProfileRoute.about) { MenuRow(systemImage: "info.circle.fill", title: "Giới thiệu") }
                        Divider().overlay(Palette.divider).padding(.leading, 46)
                        NavigationLink(value: ProfileRoute.faq) { MenuRow(systemImage: "questionmark.circle.fill", title: "Câu hỏi thường gặp") }
                        Divider().overlay(Palette.divider).padding(.leading, 46)
                        Button { confirmLogout = true } label: {
                            MenuRow(systemImage: "rectangle.portrait.and.arrow.right", title: "Đăng xuất", tint: Palette.danger, showsChevron: false)
                        }
                        .accessibilityIdentifier("logout")
                    }
                    .buttonStyle(.plain)
                    .surfaceCard(padding: Spacing.s3, shadow: false)
                }
                Text("Phiên bản \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0")")
                    .appText(.caption).foregroundStyle(Palette.textMuted).frame(maxWidth: .infinity)
            }
            .padding(.horizontal, Spacing.gutter)
            .padding(.top, Spacing.s2)
            .padding(.bottom, 120)
        }
        .screenBackground()
        // The root's title is never shown (bar hidden) but names the pushed screens' back button.
        .navigationTitle("Quay lại")
        .toolbar(.hidden, for: .navigationBar)
        .confirmationDialog("Đăng xuất?", isPresented: $confirmLogout, titleVisibility: .visible) {
            Button("Đăng xuất", role: .destructive) { Task { await model.logout() } }
            Button("Ở lại", role: .cancel) {}
        } message: {
            Text("Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.")
        }
    }

    private var profileCard: some View {
        let me = model.me
        let p = model.context?.driverProfile
        return VStack(alignment: .leading, spacing: Spacing.s4) {
            HStack(spacing: Spacing.s3) {
                LetterAvatar(name: me?.name ?? "?", size: 64)
                VStack(alignment: .leading, spacing: 4) {
                    Text(me?.name ?? " ").appText(.h2).foregroundStyle(Palette.textPrimary)
                    Text(me?.phone ?? "").appText(.label).foregroundStyle(Palette.textSecondary)
                    BadgeView(text: model.isOnline ? "Đang nhận chuyến" : "Đang nghỉ",
                              background: model.isOnline ? Palette.successContainer : Palette.surfaceVariant,
                              foreground: model.isOnline ? Palette.onSuccessContainer : Palette.textSecondary)
                }
                Spacer(minLength: 0)
            }
            if let vname = me?.vehicleName {
                HStack(spacing: Spacing.s2) {
                    Image(systemName: "car.fill").foregroundStyle(Palette.primary)
                    Text(vname).appText(.bodyStrong).foregroundStyle(Palette.textPrimary)
                    Spacer()
                    if let plate = me?.vehiclePlate {
                        Text(plate).appText(.label).fontWeight(.semibold).foregroundStyle(Palette.onPrimaryContainer)
                            .padding(.horizontal, 10).padding(.vertical, 4)
                            .background(Palette.primaryContainer, in: Capsule())
                    }
                }
                .padding(Spacing.s3)
                .background(Palette.surfaceVariant.opacity(0.6), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            VStack(alignment: .leading, spacing: Spacing.s2) {
                Text("Thống kê").appText(.label).foregroundStyle(Palette.textSecondary)
                Grid(horizontalSpacing: Spacing.s2, verticalSpacing: Spacing.s2) {
                    GridRow {
                        StatCard(label: "Đánh giá", value: p?.rating.map { String(format: "%.2f", $0).replacingOccurrences(of: ".", with: ",") + " ★" } ?? "—")
                        StatCard(label: "Tổng chuyến", value: p?.totalTrips.map { Fmt.groupThousands($0) } ?? "—")
                    }
                    GridRow {
                        StatCard(label: "Tỉ lệ nhận", value: p?.acceptanceRate.map { "\(Int($0.rounded()))%" } ?? "—")
                        StatCard(label: "Tỉ lệ hoàn thành", value: p?.completionRate.map { "\(Int($0.rounded()))%" } ?? "—")
                    }
                }
            }
        }
        .surfaceCard()
        .accessibilityElement(children: .contain).accessibilityIdentifier("profile-card")
    }

    private func menu(_ title: String, _ items: [(ProfileRoute, String, String)]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s2) {
            SectionTitle(text: title)
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                    NavigationLink(value: item.0) { MenuRow(systemImage: item.1, title: item.2) }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("menu-\(item.0.rawValue)")
                    if index < items.count - 1 { Divider().overlay(Palette.divider).padding(.leading, 46) }
                }
            }
            .surfaceCard(padding: Spacing.s3, shadow: false)
        }
    }
}

/// Shared sub-screen chrome: system nav bar (glass) + themed background.
struct SubScreen<Content: View>: View {
    var title: String
    @ViewBuilder var content: Content
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.s4) { content }
                .padding(Spacing.gutter)
                .padding(.bottom, 100)
        }
        .screenBackground()
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct EditProfileView: View {
    @Environment(AppModel.self) private var model
    @State private var name = ""
    @State private var saving = false
    @State private var alert: (String, String)?

    var body: some View {
        SubScreen(title: "Chỉnh sửa hồ sơ") {
            VStack(spacing: Spacing.s2) {
                LetterAvatar(name: name.isEmpty ? (model.me?.name ?? "?") : name, size: 88)
                Text("Ảnh đại diện lấy theo chữ cái đầu của tên").appText(.caption).foregroundStyle(Palette.textMuted)
            }
            .frame(maxWidth: .infinity)
            VStack(spacing: Spacing.s3) {
                FormField(label: "Tên hiển thị", placeholder: "Nhập tên của bạn", text: $name, capitalization: .words, identifier: "edit-name")
                FormField(label: "Số điện thoại", placeholder: "", text: .constant(model.me?.phone ?? ""), readOnly: true)
                FormField(label: "Email", placeholder: "", text: .constant(model.me?.email ?? ""), readOnly: true)
            }
            .surfaceCard(shadow: false)
            let trimmed = name.trimmingCharacters(in: .whitespaces)
            CzenButton(title: "Lưu thay đổi", loading: saving, disabled: trimmed.isEmpty || trimmed == model.me?.name, identifier: "edit-save") {
                saving = true
                Task {
                    do { try await model.updateName(trimmed); alert = ("Đã lưu", "Hồ sơ của bạn đã được cập nhật.") }
                    catch { alert = ("Lỗi", "Không thể lưu hồ sơ, vui lòng thử lại.") }
                    saving = false
                }
            }
        }
        .onAppear { if name.isEmpty { name = model.me?.name ?? "" } }
        .alert(alert?.0 ?? "", isPresented: Binding(get: { alert != nil }, set: { if !$0 { alert = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(alert?.1 ?? "") }
    }
}

struct VehicleView: View {
    @Environment(AppModel.self) private var model
    @State private var type: VehicleType?
    @State private var name = ""
    @State private var plate = ""
    @State private var loaded = false
    @State private var saving = false
    @State private var alert: (String, String)?

    var body: some View {
        let me = model.me
        let changed = type?.rawValue != me?.vehicleType || name != (me?.vehicleName ?? "") || plate != (me?.vehiclePlate ?? "")
        SubScreen(title: "Quản lý xe") {
            VStack(spacing: Spacing.s3) {
                VehicleTypeSelect(selection: $type)
                FormField(label: "Tên xe", placeholder: "VD: Toyota Vios", text: $name, capitalization: .words)
                FormField(label: "Biển số", placeholder: "VD: 36B6-36363", text: $plate, capitalization: .characters)
            }
            .surfaceCard(shadow: false)
            CzenButton(title: "Lưu thay đổi", loading: saving, disabled: !changed || type == nil) {
                saving = true
                Task {
                    do {
                        try await model.updateVehicle(type: type?.rawValue ?? "", plate: plate.uppercased(), name: name)
                        alert = ("Đã lưu", "Thông tin xe đã được cập nhật.")
                    } catch { alert = ("Lỗi", "Không thể lưu thông tin xe, vui lòng thử lại.") }
                    saving = false
                }
            }
        }
        .onAppear {
            guard !loaded else { return }
            loaded = true
            type = me?.vehicleType.flatMap(VehicleType.init(rawValue:))
            name = me?.vehicleName ?? ""
            plate = me?.vehiclePlate ?? ""
        }
        .alert(alert?.0 ?? "", isPresented: Binding(get: { alert != nil }, set: { if !$0 { alert = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(alert?.1 ?? "") }
    }
}
