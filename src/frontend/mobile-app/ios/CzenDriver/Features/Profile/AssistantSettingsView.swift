import SwiftUI

/// "Cài đặt trợ lý": voice language (local), call mode, hands-free, pickup notify, auto-suggest.
struct AssistantSettingsView: View {
    @Environment(AppModel.self) private var model
    @Environment(Preferences.self) private var prefs

    var body: some View {
        SubScreen(title: "Cài đặt trợ lý") {
            Text("Bật/tắt các tính năng trợ lý sẽ tự động thực hiện thay bạn. Cài đặt được lưu trên tài khoản — đăng nhập ở máy khác hoặc cài lại app vẫn giữ nguyên.")
                .appText(.body).foregroundStyle(Palette.textSecondary)
            Text("Chọn ngôn ngữ Trợ lý nói và hiểu. Áp dụng từ lần kết nối tiếp theo.")
                .appText(.caption).foregroundStyle(Palette.textMuted)
            if let s = model.settings {
                VStack(spacing: 0) {
                    langPicker
                    divider
                    callModePicker(s)
                    divider
                    toggleRow(title: "Chế độ rảnh tay", subtitle: "Nghe từ khoá đánh thức ở chế độ nền để điều khiển bằng giọng nói",
                              isOn: s.handsFreeMode, id: "hands-free") { v in
                        await model.patchSettings(AccountSettingsPatch(handsFreeMode: v))
                    }
                    divider
                    toggleRow(title: "Thông báo khách khi gần điểm đón",
                              subtitle: "Tự động gọi/nhắn khách khi tài xế còn cách điểm đón dưới \(radius(s.notifyOnPickupApproachRadiusM))",
                              isOn: s.notifyOnPickupApproach, id: "notify-approach") { v in
                        await model.patchSettings(AccountSettingsPatch(notifyOnPickupApproach: v))
                    }
                    if s.notifyOnPickupApproach {
                        VStack(alignment: .leading, spacing: Spacing.s2) {
                            Text("Gọi nhắc khi còn cách").appText(.label).foregroundStyle(Palette.textSecondary)
                            HStack(spacing: Spacing.s2) {
                                ForEach([500, 1000, 2000, 3000], id: \.self) { r in
                                    let selected = s.notifyOnPickupApproachRadiusM == r
                                    Button {
                                        Task { await model.patchSettings(AccountSettingsPatch(notifyOnPickupApproachRadiusM: r)) }
                                    } label: {
                                        Text(radius(r)).appText(.label).fontWeight(.semibold)
                                            .foregroundStyle(selected ? Palette.onPrimaryContainer : Palette.textSecondary)
                                            .frame(maxWidth: .infinity, minHeight: 40)
                                            .background(selected ? Palette.chipSelected : Palette.surfaceVariant, in: Capsule())
                                            .overlay(Capsule().strokeBorder(selected ? Palette.primary : .clear, lineWidth: 1.5))
                                    }
                                    .buttonStyle(.plain)
                                    .accessibilityAddTraits(selected ? .isSelected : [])
                                }
                            }
                        }
                        .padding(.bottom, Spacing.s3)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                    divider
                    toggleRow(title: "Tự gợi ý điểm dừng tiếp theo",
                              subtitle: "Trợ lý tự đề xuất điểm đón/trả kế tiếp khi còn cách dưới \(radius(s.autoSuggestNextStopRadiusM))",
                              isOn: s.autoSuggestNextStop, id: "auto-suggest") { v in
                        await model.patchSettings(AccountSettingsPatch(autoSuggestNextStop: v))
                    }
                }
                .padding(.horizontal, Spacing.s4)
                .background(Palette.surfaceElevated, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                .animation(.snappy, value: s.notifyOnPickupApproach)
            } else if model.settingsError {
                EmptyStateView(systemImage: "exclamationmark.circle", title: "Không thể tải cài đặt", actionTitle: "Thử lại") {
                    Task { await model.loadSettings() }
                }
            } else {
                SkeletonBlock(height: 72, radius: 16)
                SkeletonBlock(height: 72, radius: 16)
                SkeletonBlock(height: 72, radius: 16)
            }
        }
        .task(id: model.me?.id) { await model.loadSettings() }
        .accessibilityElement(children: .contain).accessibilityIdentifier("assistant-settings")
    }

    private var divider: some View { Divider().overlay(Palette.divider) }

    private func radius(_ m: Int) -> String { m < 1000 ? "\(m) m" : "\(m / 1000) km" }

    private var langPicker: some View {
        VStack(alignment: .leading, spacing: Spacing.s2) {
            Text("Ngôn ngữ trợ lý").appText(.title).foregroundStyle(Palette.textPrimary)
            ForEach(Preferences.VoiceLang.allCases, id: \.self) { lang in
                let selected = prefs.voiceLang == lang
                Button { prefs.voiceLang = lang } label: {
                    HStack(spacing: Spacing.s3) {
                        Text(lang == .vn ? "🇻🇳" : "🇺🇸").font(.system(size: 22))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(lang == .vn ? "Tiếng Việt" : "English").appText(.bodyStrong).foregroundStyle(Palette.textPrimary)
                            Text(lang == .vn ? "Việt Nam" : "English-speaking regions").appText(.caption).foregroundStyle(Palette.textSecondary)
                        }
                        Spacer()
                        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 20)).foregroundStyle(selected ? Palette.primary : Palette.borderStrong)
                    }
                    .frame(minHeight: 48)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(.vertical, Spacing.s3)
    }

    private func callModePicker(_ s: AccountSettings) -> some View {
        VStack(alignment: .leading, spacing: Spacing.s2) {
            Text("Gọi khách mặc định").appText(.title).foregroundStyle(Palette.textPrimary)
            ForEach([("agent", "AI gọi hộ", "AI nói với khách, bạn nghe live và có thể chen vào khi cần", "person.wave.2.fill"),
                     ("bridge", "Bạn nói trực tiếp", "AI chỉ quay số, bạn nói trực tiếp với khách", "phone.connection.fill")], id: \.0) { mode in
                let selected = s.defaultCustomerCallMode == mode.0
                Button {
                    Task { await model.patchSettings(AccountSettingsPatch(defaultCustomerCallMode: mode.0)) }
                } label: {
                    HStack(alignment: .top, spacing: Spacing.s3) {
                        Image(systemName: mode.3).foregroundStyle(selected ? Palette.primary : Palette.textMuted).frame(width: 24).padding(.top, 2)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(mode.1).appText(.bodyStrong).foregroundStyle(Palette.textPrimary)
                            Text(mode.2).appText(.caption).foregroundStyle(Palette.textSecondary).fixedSize(horizontal: false, vertical: true)
                        }
                        Spacer()
                        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                            .font(.system(size: 20)).foregroundStyle(selected ? Palette.primary : Palette.borderStrong)
                    }
                    .padding(Spacing.s3)
                    .background(selected ? Palette.chipSelected : .clear, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(selected ? Palette.primary.opacity(0.6) : Palette.border, lineWidth: 1))
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(.vertical, Spacing.s3)
    }

    private func toggleRow(title: String, subtitle: String, isOn: Bool, id: String, onChange: @escaping (Bool) async -> Void) -> some View {
        Toggle(isOn: Binding(get: { isOn }, set: { v in Task { await onChange(v) } })) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).appText(.bodyStrong).foregroundStyle(Palette.textPrimary)
                Text(subtitle).appText(.caption).foregroundStyle(Palette.textSecondary).fixedSize(horizontal: false, vertical: true)
            }
        }
        .tint(Palette.primary)
        .padding(.vertical, Spacing.s3)
        .accessibilityIdentifier("toggle-\(id)")
    }
}
