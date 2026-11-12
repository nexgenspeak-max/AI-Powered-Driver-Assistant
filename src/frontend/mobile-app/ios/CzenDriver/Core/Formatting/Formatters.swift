import Foundation

/// vi-VN formatting helpers, ported from `src/utils/format.ts`.
enum Fmt {
    private static let viLocale = Locale(identifier: "vi_VN")

    /// "120.000 ₫" — matches `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})`.
    static func currency(_ amount: Double, currency: String = "VND") -> String {
        if currency.uppercased() != "VND" {
            return amount.formatted(.currency(code: currency).locale(viLocale))
        }
        let rounded = Int((amount).rounded())
        return "\(groupThousands(abs(rounded)))\u{00A0}₫".withSign(rounded < 0)
    }

    /// "4,5 km" under 10 km, "12 km" / "1.674 km" above.
    static func km(_ km: Double?) -> String {
        guard let km, km.isFinite else { return "" }
        if km >= 10 { return "\(groupThousands(Int(km.rounded()))) km" }
        let tenths = (km * 10).rounded() / 10
        return String(format: "%.1f", tenths).replacingOccurrences(of: ".", with: ",") + " km"
    }

    /// "12 phút", "1 giờ", "1 giờ 05 phút".
    static func minutes(_ min: Double?) -> String {
        guard let min, min.isFinite else { return "" }
        let m = max(0, Int(min.rounded()))
        if m < 60 { return "\(m) phút" }
        let h = m / 60, rest = m % 60
        return rest == 0 ? "\(h) giờ" : "\(h) giờ \(String(format: "%02d", rest)) phút"
    }

    /// "12 phút · 4,5 km"; "—" without an ETA.
    static func route(eta: Double?, km kmValue: Double?) -> String {
        guard let eta, eta != 0 else { return "—" }
        return [minutes(eta), km(kmValue)].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    /// Distance in metres for the HUD: "200 m" under 1 km, otherwise km.
    static func meters(_ m: Double) -> String {
        if m < 1000 { return "\(Int((m / 10).rounded() * 10)) m" }
        return km(m / 1000)
    }

    static func parseISO(_ iso: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: iso)
    }

    /// "14:30" — time only; a bare "14:30" passes through as-is.
    static func time(_ iso: String) -> String {
        guard !iso.isEmpty else { return "—" }
        guard let d = parseISO(iso) else { return iso }
        let f = DateFormatter()
        f.locale = viLocale
        f.dateFormat = "HH:mm"
        return f.string(from: d)
    }

    /// vi-VN short date and time ("14:30 12/11/2026").
    static func dateTime(_ iso: String) -> String {
        guard !iso.isEmpty else { return "—" }
        guard let d = parseISO(iso) else { return iso }
        let f = DateFormatter()
        f.locale = viLocale
        f.dateFormat = "HH:mm dd/MM/yyyy"
        return f.string(from: d)
    }

    /// One decimal with a comma ("4,5").
    static func decimal(_ value: Double, digits: Int = 1) -> String {
        String(format: "%.\(digits)f", value).replacingOccurrences(of: ".", with: ",")
    }

    static func groupThousands(_ value: Int) -> String {
        let digits = Array(String(value))
        var out = ""
        for (i, ch) in digits.enumerated() {
            if i > 0 && (digits.count - i) % 3 == 0 { out.append(".") }
            out.append(ch)
        }
        return out
    }
}

private extension String {
    func withSign(_ negative: Bool) -> String { negative ? "-" + self : self }
}

/// Accent-insensitive Vietnamese search, ported from `src/utils/search.ts`.
enum ViSearch {
    static func fold(_ text: String?) -> String {
        guard let text else { return "" }
        let stripped = text
            .replacingOccurrences(of: "đ", with: "d")
            .replacingOccurrences(of: "Đ", with: "D")
            .decomposedStringWithCanonicalMapping
            .unicodeScalars
            .filter { !(0x0300...0x036F).contains($0.value) }
        return String(String.UnicodeScalarView(stripped))
            .lowercased()
            .split(whereSeparator: { $0.isWhitespace })
            .joined(separator: " ")
    }

    /// True when every word of `query` appears in any of `fields` (folded).
    static func matches(_ query: String, _ fields: [String?]) -> Bool {
        let q = fold(query)
        if q.isEmpty { return true }
        let hay = fold(fields.compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " "))
        return q.split(separator: " ").allSatisfy { hay.contains($0) }
    }
}
