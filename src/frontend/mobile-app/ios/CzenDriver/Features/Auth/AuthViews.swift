import SwiftUI

enum AuthRoute: Hashable { case login, register }

/// `(auth)` stack: landing → login / register.
struct AuthFlowView: View {
    @State private var path: [AuthRoute]

    init(initial: String?) {
        switch initial {
        case "login": _path = State(initialValue: [.login])
        case "register": _path = State(initialValue: [.register])
        default: _path = State(initialValue: [])
        }
    }

    var body: some View {
        NavigationStack(path: $path) {
            LandingView(path: $path)
                .navigationDestination(for: AuthRoute.self) { route in
                    switch route {
                    case .login: LoginView(path: $path)
                    case .register: RegisterView(path: $path)
                    }
                }
        }
    }
}

struct AuthBackground: View {
    var body: some View {
        LinearGradient(stops: [.init(color: Palette.authTop, location: 0), .init(color: Palette.authMid, location: 0.45), .init(color: Palette.authBottom, location: 1)],
                       startPoint: .top, endPoint: .bottom)
            .overlay(alignment: .topTrailing) {
                Circle().fill(Palette.primary.opacity(0.28)).frame(width: 320, height: 320).blur(radius: 90).offset(x: 120, y: -120)
            }
            .ignoresSafeArea()
    }
}

struct LandingView: View {
    @Binding var path: [AuthRoute]

    var body: some View {
        ZStack {
            AuthBackground()
            VStack(spacing: 0) {
                Spacer(minLength: 24)
                BrandTile(size: 132).padding(.bottom, 36)
                Text("Czen").appText(.display).font(.system(size: 40, weight: .bold)).foregroundStyle(Palette.authTitle)
                Text("Trợ lý giọng nói cho tài xế")
                    .appText(.h2).foregroundStyle(Palette.primary).padding(.top, 6)
                Text("Nhận chuyến, gọi khách, xem thu nhập — chỉ cần nói, mắt vẫn trên đường.")
                    .appText(.body).foregroundStyle(Palette.textSecondary)
                    .multilineTextAlignment(.center).padding(.top, 12).padding(.horizontal, 28)
                Spacer(minLength: 24)
                GlassEffectContainer(spacing: 12) {
                    VStack(spacing: 12) {
                        CzenButton(title: "Đăng nhập", identifier: "landing-login") { path.append(.login) }
                        CzenButton(title: "Đăng ký", kind: .outline, identifier: "landing-register") { path.append(.register) }
                    }
                }
                .padding(.horizontal, Spacing.gutter)
                .padding(.bottom, 12)
            }
            .frame(maxWidth: 480)
        }
        // Title hidden by the empty principal item; it names the back button on login/register.
        .navigationTitle("Quay lại")
        .toolbar {
            ToolbarItem(placement: .principal) { EmptyView() }
            ToolbarItem(placement: .topBarTrailing) { ThemeToggle() }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
    }
}

/// Glass-free auth field (radius 16): label, icon, optional secure toggle, error.
struct AuthField: View {
    var label: String
    var placeholder: String
    @Binding var text: String
    var error: String?
    var keyboard: UIKeyboardType = .default
    var secure = false
    var capitalization: TextInputAutocapitalization = .never
    var contentType: UITextContentType?
    var identifier: String
    @State private var revealed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).appText(.label).foregroundStyle(Palette.textSecondary)
            HStack(spacing: 8) {
                Group {
                    if secure && !revealed {
                        SecureField(placeholder, text: $text)
                    } else {
                        TextField(placeholder, text: $text)
                    }
                }
                .appText(.body)
                .foregroundStyle(Palette.textPrimary)
                .keyboardType(keyboard)
                .textInputAutocapitalization(capitalization)
                .autocorrectionDisabled()
                .textContentType(contentType)
                .accessibilityIdentifier(identifier)
                if secure {
                    Button { revealed.toggle() } label: {
                        Image(systemName: revealed ? "eye.slash" : "eye").foregroundStyle(Palette.textMuted).frame(width: 44, height: 44)
                    }
                    .accessibilityLabel(revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu")
                }
            }
            .padding(.leading, 14)
            .padding(.trailing, secure ? 0 : 14)
            .frame(minHeight: 52)
            .background(Palette.authField, in: RoundedRectangle(cornerRadius: Radius.authField, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Radius.authField, style: .continuous)
                .strokeBorder(error == nil ? Palette.authFieldRing : Palette.danger, lineWidth: 1))
            if let error {
                Text(error).appText(.caption).foregroundStyle(Palette.danger)
            }
        }
    }
}

struct AuthHeader: View {
    var title: String
    var subtitle: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            BrandTile(size: 56).padding(.bottom, 8)
            Text(title).appText(.display).foregroundStyle(Palette.authTitle).accessibilityAddTraits(.isHeader)
            Text(subtitle).appText(.body).foregroundStyle(Palette.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct LoginView: View {
    @Environment(AppModel.self) private var model
    @Binding var path: [AuthRoute]
    @State private var phone = ""
    @State private var password = ""
    @State private var errors: [String: String] = [:]
    @State private var failed = false
    @State private var loading = false

    var body: some View {
        ZStack {
            AuthBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.s5) {
                    AuthHeader(title: "Đăng nhập", subtitle: "Chào mừng trở lại. Đăng nhập để bắt đầu nhận chuyến.")
                    VStack(spacing: Spacing.s4) {
                        AuthField(label: "Số điện thoại", placeholder: "0901 234 567", text: $phone, error: errors["phone"],
                                  keyboard: .phonePad, contentType: .telephoneNumber, identifier: "login-phone")
                        AuthField(label: "Mật khẩu", placeholder: "••••••", text: $password, error: errors["password"],
                                  secure: true, contentType: .password, identifier: "login-password")
                        if failed {
                            Text("Đăng nhập thất bại. Kiểm tra lại thông tin.").appText(.label).foregroundStyle(Palette.danger)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        CzenButton(title: "Đăng nhập", loading: loading, identifier: "login-submit") { submit() }
                            .padding(.top, 4)
                    }
                    .padding(Spacing.s5)
                    .background(Palette.authCard, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                    .shadow(color: .black.opacity(0.18), radius: 24, y: 10)

                    Button { path = [.register] } label: {
                        Text("Chưa có tài khoản? \(Text("Đăng ký").foregroundStyle(Palette.primary).bold())").foregroundStyle(Palette.textSecondary)
                            .appText(.body)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                }
                .padding(.horizontal, Spacing.gutter)
                .padding(.vertical, Spacing.s4)
                .frame(maxWidth: 440)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    private func submit() {
        var e: [String: String] = [:]
        if phone.trimmingCharacters(in: .whitespaces).count < 8 { e["phone"] = "Số điện thoại chưa hợp lệ" }
        if password.count < 6 { e["password"] = "Mật khẩu tối thiểu 6 ký tự" }
        errors = e
        failed = false
        guard e.isEmpty else { return }
        loading = true
        Task {
            do { try await model.login(phone: phone.filter { !$0.isWhitespace }, password: password) } catch { failed = true }
            loading = false
        }
    }
}

struct RegisterView: View {
    @Environment(AppModel.self) private var model
    @Binding var path: [AuthRoute]
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var password = ""
    @State private var vehicleType: VehicleType?
    @State private var plate = ""
    @State private var vehicleName = ""
    @State private var errors: [String: String] = [:]
    @State private var failed = false
    @State private var request: Task<Void, Never>?

    var body: some View {
        ZStack {
            AuthBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.s5) {
                    AuthHeader(title: "Trở thành tài xế Czen", subtitle: "Vài thông tin về bạn và xe là xong.")
                    VStack(spacing: Spacing.s4) {
                        AuthField(label: "Họ và tên", placeholder: "Nguyễn Văn A", text: $name, error: errors["name"], capitalization: .words, contentType: .name, identifier: "register-name")
                        AuthField(label: "Số điện thoại", placeholder: "0901 234 567", text: $phone, error: errors["phone"], keyboard: .phonePad, contentType: .telephoneNumber, identifier: "register-phone")
                        AuthField(label: "Email", placeholder: "you@example.com", text: $email, error: errors["email"], keyboard: .emailAddress, contentType: .emailAddress, identifier: "register-email")
                        AuthField(label: "Mật khẩu", placeholder: "••••••", text: $password, error: errors["password"], secure: true, contentType: .newPassword, identifier: "register-password")
                        VehicleTypeSelect(selection: $vehicleType, error: errors["vehicle_type"])
                        AuthField(label: "Biển số xe", placeholder: "36C1-36363", text: $plate, error: errors["plate"], capitalization: .characters, identifier: "register-plate")
                        AuthField(label: "Tên xe", placeholder: "Honda Wave", text: $vehicleName, error: errors["vehicle_name"], capitalization: .words, identifier: "register-vehicle")
                        if failed {
                            Text("Đăng ký thất bại. Kiểm tra lại thông tin.").appText(.label).foregroundStyle(Palette.danger)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        CzenButton(title: "Đăng ký", loading: request != nil, identifier: "register-submit") { submit() }
                        if request != nil {
                            CzenButton(title: "Huỷ", kind: .outline) { request?.cancel(); request = nil }
                        }
                    }
                    .padding(Spacing.s5)
                    .background(Palette.authCard, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
                    .shadow(color: .black.opacity(0.18), radius: 24, y: 10)

                    Button { path = [.login] } label: {
                        Text("Đã có tài khoản? \(Text("Đăng nhập").foregroundStyle(Palette.primary).bold())").foregroundStyle(Palette.textSecondary)
                            .appText(.body)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                }
                .padding(.horizontal, Spacing.gutter)
                .padding(.vertical, Spacing.s4)
                .frame(maxWidth: 440)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
    }

    static func validate(name: String, phone: String, email: String, password: String, vehicleType: VehicleType?, plate: String, vehicleName: String) -> [String: String] {
        var e: [String: String] = [:]
        if name.trimmingCharacters(in: .whitespaces).count < 2 { e["name"] = "Tên tối thiểu 2 ký tự" }
        if phone.trimmingCharacters(in: .whitespaces).count < 8 { e["phone"] = "Số điện thoại chưa hợp lệ" }
        let emailOK = email.range(of: #"^[^@\s]+@[^@\s]+\.[^@\s]+$"#, options: .regularExpression) != nil
        if !emailOK { e["email"] = "Email chưa hợp lệ" }
        if password.count < 6 { e["password"] = "Mật khẩu tối thiểu 6 ký tự" }
        if vehicleType == nil { e["vehicle_type"] = "Chọn loại xe" }
        if plate.trimmingCharacters(in: .whitespaces).count < 3 { e["plate"] = "Biển số chưa hợp lệ" }
        if vehicleName.trimmingCharacters(in: .whitespaces).count < 2 { e["vehicle_name"] = "Nhập tên xe" }
        return e
    }

    private func submit() {
        errors = Self.validate(name: name, phone: phone, email: email, password: password, vehicleType: vehicleType, plate: plate, vehicleName: vehicleName)
        failed = false
        guard errors.isEmpty, let vehicleType else { return }
        let input = RegisterInput(phone: phone.filter { !$0.isWhitespace }, name: name.trimmingCharacters(in: .whitespaces), email: email.trimmingCharacters(in: .whitespaces),
                                  password: password, vehicleType: vehicleType.rawValue, vehiclePlate: plate.uppercased(), vehicleName: vehicleName)
        request = Task {
            do {
                try await model.register(input)
            } catch {
                // A cancelled request hides the error text.
                if !Task.isCancelled, (error as? APIError) != .cancelled { failed = true }
            }
            request = nil
        }
    }
}

/// "Loại xe" dropdown (menu picker).
struct VehicleTypeSelect: View {
    @Binding var selection: VehicleType?
    var error: String?
    var label = "Loại xe"

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).appText(.label).foregroundStyle(Palette.textSecondary)
            Menu {
                ForEach(VehicleType.allCases) { type in
                    Button { selection = type } label: {
                        if selection == type { Label(type.label, systemImage: "checkmark") } else { Text(type.label) }
                    }
                }
            } label: {
                HStack {
                    Text(selection?.label ?? "Chọn loại xe")
                        .appText(.body)
                        .foregroundStyle(selection == nil ? Palette.textMuted : Palette.textPrimary)
                    Spacer()
                    Image(systemName: "chevron.down").foregroundStyle(Palette.textMuted)
                }
                .padding(.horizontal, 14)
                .frame(minHeight: 52)
                .background(Palette.authField, in: RoundedRectangle(cornerRadius: Radius.authField, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Radius.authField, style: .continuous)
                    .strokeBorder(error == nil ? Palette.authFieldRing : Palette.danger, lineWidth: 1))
            }
            .accessibilityLabel(label)
            .accessibilityValue(selection?.label ?? "Chọn loại xe")
            .accessibilityIdentifier("vehicle-type")
            if let error { Text(error).appText(.caption).foregroundStyle(Palette.danger) }
        }
    }
}
