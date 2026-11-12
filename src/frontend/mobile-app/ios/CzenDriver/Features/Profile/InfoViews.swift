import SwiftUI

struct BankInfoView: View {
    @State private var soon = false
    var body: some View {
        SubScreen(title: "Tài khoản ngân hàng") {
            EmptyStateView(systemImage: "creditcard", title: "Chưa liên kết tài khoản ngân hàng",
                           message: "Thêm tài khoản ngân hàng để nhận thanh toán tiền cước trực tiếp. Tính năng này đang được phát triển.")
                .surfaceCard(shadow: false)
            CzenButton(title: "Thêm tài khoản ngân hàng", systemImage: "plus") { soon = true }
        }
        .alert("Sắp ra mắt", isPresented: $soon) { Button("OK", role: .cancel) {} }
    }
}

struct DocumentsView: View {
    @State private var soon = false
    var body: some View {
        SubScreen(title: "Giấy tờ xác minh") {
            Text("Tải lên giấy tờ để được xác minh và tiếp tục nhận chuyến. Tính năng tải ảnh giấy tờ đang được phát triển.")
                .appText(.body).foregroundStyle(Palette.textSecondary)
            VStack(spacing: 0) {
                ForEach(Array(["Bằng lái xe", "Đăng ký xe", "Bảo hiểm xe"].enumerated()), id: \.offset) { i, doc in
                    Button { soon = true } label: {
                        HStack(spacing: Spacing.s3) {
                            Image(systemName: "doc.badge.arrow.up").foregroundStyle(Palette.primary).frame(width: 34, height: 34)
                                .background(Palette.primaryMuted, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                            Text(doc).appText(.body).foregroundStyle(Palette.textPrimary)
                            Spacer()
                            BadgeView(text: "Chưa tải lên", background: Palette.warningContainer, foreground: Color("OnWarningContainer"))
                        }
                        .frame(minHeight: 52)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if i < 2 { Divider().overlay(Palette.divider) }
                }
            }
            .surfaceCard(padding: Spacing.s3, shadow: false)
        }
        .alert("Sắp ra mắt", isPresented: $soon) { Button("OK", role: .cancel) {} } message: {
            Text("Tính năng tải lên giấy tờ sẽ sớm khả dụng.")
        }
    }
}

struct SafetyView: View {
    @Environment(\.openURL) private var openURL
    private let numbers = [("Công an", "113"), ("Cấp cứu y tế", "115"), ("Phòng cháy chữa cháy", "114")]
    private let tips = [
        "Xác nhận đúng khách hàng và điểm đón trước khi bắt đầu chuyến đi.",
        "Nghỉ ngơi đầy đủ, không nhận chuyến khi cảm thấy quá mệt hoặc buồn ngủ.",
        "Luôn thắt dây an toàn và tuân thủ luật giao thông trong suốt chuyến đi.",
        "Nếu gặp tình huống bất thường với khách, hãy dừng xe ở nơi an toàn và liên hệ khẩn cấp ngay.",
    ]

    var body: some View {
        SubScreen(title: "Trung tâm an toàn") {
            VStack(alignment: .leading, spacing: 0) {
                Text("Gọi khẩn cấp").appText(.label).foregroundStyle(Palette.textSecondary).padding(.bottom, Spacing.s2)
                ForEach(Array(numbers.enumerated()), id: \.offset) { i, item in
                    Button { if let url = URL(string: "tel:\(item.1)") { openURL(url) } } label: {
                        HStack(spacing: Spacing.s3) {
                            Image(systemName: "phone.fill").foregroundStyle(Palette.danger)
                            Text(item.0).appText(.label).foregroundStyle(Palette.textPrimary)
                            Spacer()
                            Text(item.1).appText(.bodyStrong).foregroundStyle(Palette.textSecondary)
                        }
                        .frame(minHeight: 48)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Gọi \(item.0), \(item.1)")
                    if i < numbers.count - 1 { Divider().overlay(Palette.border) }
                }
            }
            .surfaceCard(shadow: false)
            VStack(alignment: .leading, spacing: Spacing.s3) {
                Text("Mẹo an toàn khi lái xe").appText(.label).foregroundStyle(Palette.textSecondary)
                ForEach(tips, id: \.self) { tip in
                    HStack(alignment: .top, spacing: Spacing.s2) {
                        Image(systemName: "checkmark.shield.fill").font(.system(size: 15)).foregroundStyle(Palette.success).padding(.top, 2)
                        Text(tip).appText(.body).foregroundStyle(Palette.textPrimary)
                    }
                }
            }
            .surfaceCard(shadow: false)
        }
    }
}

struct SupportView: View {
    @Environment(\.openURL) private var openURL
    @Binding var path: [ProfileRoute]
    var body: some View {
        SubScreen(title: "Hỗ trợ") {
            Text("Cần giúp đỡ? Liên hệ với đội ngũ hỗ trợ tài xế qua các kênh bên dưới, hoặc xem câu hỏi thường gặp.")
                .appText(.body).foregroundStyle(Palette.textSecondary)
            VStack(spacing: 0) {
                row("phone.fill", "Hotline hỗ trợ tài xế", "1900 1234") { if let u = URL(string: "tel:19001234") { openURL(u) } }
                Divider().overlay(Palette.divider)
                row("envelope.fill", "Email hỗ trợ", "driver-support@czen.vn") { if let u = URL(string: "mailto:driver-support@czen.vn") { openURL(u) } }
                Divider().overlay(Palette.divider)
                row("questionmark.circle.fill", "Câu hỏi thường gặp", nil) { path.append(.faq) }
            }
            .surfaceCard(padding: Spacing.s3, shadow: false)
        }
    }

    private func row(_ icon: String, _ title: String, _ value: String?, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.s3) {
                Image(systemName: icon).foregroundStyle(Palette.primary).frame(width: 34, height: 34)
                    .background(Palette.primaryMuted, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).appText(.body).foregroundStyle(Palette.textPrimary)
                    if let value { Text(value).appText(.caption).foregroundStyle(Palette.textSecondary) }
                }
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.textMuted)
            }
            .frame(minHeight: 52)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

struct TermsView: View {
    private let sections = [
        ("1. Chấp nhận điều khoản", "Bằng việc sử dụng ứng dụng tài xế, bạn đồng ý tuân thủ các điều khoản sử dụng này. Nếu không đồng ý, vui lòng ngừng sử dụng dịch vụ."),
        ("2. Tài khoản tài xế", "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập, giữ thông tin xe/giấy tờ chính xác và cập nhật, cũng như mọi hoạt động diễn ra dưới tài khoản của mình."),
        ("3. Nhận chuyến và thanh toán", "Tiền cước mỗi chuyến được tính dựa trên quãng đường và các phụ phí (nếu có), thanh toán theo chu kỳ đối soát của nền tảng."),
        ("4. Tiêu chuẩn phục vụ", "Tài xế cần đảm bảo xe đủ điều kiện an toàn, giấy tờ hợp lệ và thái độ phục vụ khách hàng đúng mực trong suốt quá trình vận hành."),
        ("5. Quyền riêng tư", "Chúng tôi thu thập và sử dụng dữ liệu vị trí, lịch sử chuyến đi và thông tin liên hệ của bạn để cung cấp và cải thiện dịch vụ, theo Chính sách bảo mật."),
        ("6. Thay đổi điều khoản", "Điều khoản này có thể được cập nhật theo thời gian. Việc tiếp tục sử dụng ứng dụng sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới."),
    ]
    var body: some View {
        SubScreen(title: "Điều khoản & Bảo mật") {
            ForEach(sections, id: \.0) { s in
                VStack(alignment: .leading, spacing: 4) {
                    Text(s.0).appText(.h2).foregroundStyle(Palette.textPrimary)
                    Text(s.1).appText(.body).foregroundStyle(Palette.textSecondary)
                }
            }
        }
    }
}

enum InfoCopy {
    static let aboutTitle = "Czen — trợ lý giọng nói đồng hành cùng tài xế"
    static let aboutParagraphs = [
        "Czen là ứng dụng dành cho tài xế, tích hợp trợ lý AI bằng giọng nói giúp bạn nhận chuyến, chỉ đường và xử lý công việc nhanh chóng mà không cần rời tay khỏi vô lăng.",
        "Bật \"Chế độ rảnh tay\" trong Cài đặt trợ lý để gọi trợ lý bất cứ lúc nào: xác nhận/từ chối chuyến mới, xem lộ trình tối ưu cho chuyến nhiều điểm giao, chỉ đường từng chặng, gọi hoặc nhắn tin cho khách và người thân, tra cứu thu nhập, thưởng, hay báo cáo sự cố.",
        "Khi bạn đến gần điểm đón hoặc trả khách, ứng dụng tự động nhận diện vị trí để nhắc nhở hoặc gợi ý điểm dừng tiếp theo, giúp bạn tập trung lái xe an toàn hơn.",
        "Mọi chuyến đi, thu nhập và vị trí của bạn đều được cập nhật theo thời gian thực ngay trên trang tổng quan.",
    ]
    static let faq: [(String, String)] = [
        ("Làm sao để nhận chuyến mới?", "Chuyến mới hiển thị dưới dạng banner kèm âm báo trên trang tổng quan (Dashboard); bạn có thể xác nhận hoặc từ chối ngay tại đó, hoặc nhờ trợ lý AI xác nhận giúp bằng giọng nói."),
        ("Chế độ rảnh tay (trợ lý AI) hoạt động như thế nào?", "Bật \"Chế độ rảnh tay\" trong mục Cài đặt trợ lý để gọi trợ lý bằng giọng nói mà không cần chạm màn hình. Trợ lý có thể xác nhận/từ chối chuyến, chỉ đường, gọi hoặc nhắn tin cho khách, tra cứu thu nhập và nhiều việc khác."),
        ("Làm sao để tối ưu lộ trình khi chuyến có nhiều điểm giao?", "Với chuyến có nhiều điểm dừng, mở tab Chuyến đi → Đang chạy để xem lộ trình tối ưu do hệ thống sắp xếp, hoặc nhờ trợ lý AI đọc thứ tự các điểm giúp bạn đi quãng đường ngắn nhất. Trên bản đồ vẫn thấy đường và số thứ tự điểm."),
        ("Ứng dụng có chỉ đường từng chặng không?", "Có. Khi bắt đầu chuyến, màn hình điều hướng hiển thị chỉ dẫn từng chặng (turn-by-turn) và tự động cập nhật theo vị trí thực tế của bạn trong suốt hành trình."),
        ("Ứng dụng có tự nhắc khi tôi đến gần điểm đón/trả khách không?", "Có, nếu bạn bật \"Thông báo khi gần điểm đón\" hoặc \"Tự động gợi ý điểm dừng tiếp theo\" trong Cài đặt trợ lý, ứng dụng sẽ tự nhắc hoặc gợi ý ngay khi bạn vào gần khu vực đó."),
        ("Làm sao để liên hệ với khách hàng?", "Bấm vào chuyến đi đang thực hiện để gọi hoặc nhắn tin trực tiếp cho khách, hoặc nhờ trợ lý AI kết nối giúp bằng giọng nói."),
        ("Xem thu nhập và tiền thưởng ở đâu?", "Vào mục Thu nhập trên trang tổng quan để xem chi tiết, hoặc hỏi trực tiếp trợ lý AI về thu nhập hôm nay, thống kê chuyến đi hay tiền thưởng."),
        ("Làm sao để cập nhật thông tin xe, giấy tờ hoặc tài khoản ngân hàng?", "Vào trang Hồ sơ để chỉnh sửa thông tin liên hệ, thông tin xe, giấy tờ và tài khoản ngân hàng nhận tiền."),
        ("Gặp sự cố trong lúc chạy chuyến thì làm sao?", "Bạn có thể báo sự cố qua mục Hỗ trợ, hoặc nhờ trợ lý AI báo cáo sự cố hay tình trạng khách không có mặt ngay trong lúc chạy xe, không cần dừng xe thao tác thủ công."),
    ]
}

struct AboutView: View {
    var body: some View {
        SubScreen(title: "Giới thiệu") {
            BrandTile(size: 72).frame(maxWidth: .infinity).padding(.vertical, Spacing.s3)
            Text(InfoCopy.aboutTitle).appText(.h1).foregroundStyle(Palette.textPrimary)
            ForEach(InfoCopy.aboutParagraphs, id: \.self) { p in
                Text(p).appText(.body).foregroundStyle(Palette.textSecondary)
            }
        }
    }
}

/// Accordion, one open at a time.
struct FaqView: View {
    @State private var open: Int?
    var body: some View {
        SubScreen(title: "Câu hỏi thường gặp") {
            VStack(spacing: 0) {
                ForEach(Array(InfoCopy.faq.enumerated()), id: \.offset) { i, item in
                    VStack(alignment: .leading, spacing: Spacing.s2) {
                        Button { withAnimation(.snappy) { open = open == i ? nil : i } } label: {
                            HStack(alignment: .top) {
                                Text(item.0).appText(.bodyStrong).foregroundStyle(Palette.textPrimary).multilineTextAlignment(.leading)
                                Spacer()
                                Image(systemName: "chevron.down").rotationEffect(.degrees(open == i ? 180 : 0)).foregroundStyle(Palette.textMuted)
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(.isHeader)
                        .accessibilityValue(open == i ? "Đang mở" : "Đã đóng")
                        if open == i {
                            Text(item.1).appText(.body).foregroundStyle(Palette.textSecondary).transition(.opacity)
                        }
                    }
                    .padding(.vertical, Spacing.s2)
                    if i < InfoCopy.faq.count - 1 { Divider().overlay(Palette.divider) }
                }
            }
            .surfaceCard(padding: Spacing.s4, shadow: false)
        }
    }
}
