import SwiftUI

/// Czen mark: arc + three bars on a 1024 viewBox (`CzenMark.tsx`).
struct CzenMark: View {
    var color: Color = .white
    var body: some View {
        Canvas { ctx, size in
            let s = min(size.width, size.height) / 1024
            ctx.translateBy(x: (size.width - 1024 * s) / 2, y: (size.height - 1024 * s) / 2)
            ctx.scaleBy(x: s, y: s)
            var arc = Path()
            // M741.8 704.8 A300 300 0 1 1 741.8 319.2 — centre (512,512), r 300.
            let start = Angle.radians(atan2(704.8 - 512, 741.8 - 512))
            let end = Angle.radians(atan2(319.2 - 512, 741.8 - 512))
            arc.addArc(center: CGPoint(x: 512, y: 512), radius: 300, startAngle: start, endAngle: end, clockwise: false)
            ctx.stroke(arc, with: .color(color), style: StrokeStyle(lineWidth: 96, lineCap: .round))
            for r in [CGRect(x: 539, y: 437, width: 62, height: 150), CGRect(x: 624, y: 382, width: 62, height: 260), CGRect(x: 709, y: 417, width: 62, height: 190)] {
                ctx.fill(Path(roundedRect: r, cornerRadius: 31), with: .color(color))
            }
        }
        .accessibilityHidden(true)
    }
}

/// Gradient brand tile with the mark (BrandHero / AuthHeader).
struct BrandTile: View {
    var size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(Palette.gradientStart.opacity(0.45)).frame(width: size * 1.5, height: size * 1.5).blur(radius: size * 0.35)
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .fill(Palette.brandTile)
                .overlay(
                    RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                        .fill(LinearGradient(colors: [.white.opacity(0.35), .clear], startPoint: .top, endPoint: .center))
                )
                .frame(width: size, height: size)
                .shadow(color: Palette.gradientStart.opacity(0.5), radius: size * 0.2, y: size * 0.08)
            CzenMark().frame(width: size * 0.62, height: size * 0.62)
        }
        .frame(width: size, height: size)
    }
}

/// Button kinds from `Button.tsx`, rendered with Liquid Glass styles.
struct CzenButton: View {
    enum Kind { case primary, outline, success, danger, dark }
    var title: LocalizedStringKey
    var kind: Kind = .primary
    var systemImage: String?
    var loading = false
    var disabled = false
    var identifier: String?
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if loading {
                    ProgressView().tint(foreground)
                } else if let systemImage {
                    Image(systemName: systemImage).font(.system(size: 16, weight: .semibold))
                }
                Text(title).appText(.bodyStrong).lineLimit(1).minimumScaleFactor(0.8)
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity, minHeight: 36)
        }
        .modifier(StyleFor(kind: kind))
        .controlSize(.large)
        .disabled(disabled || loading)
        .accessibilityIdentifier(identifier ?? "")
    }

    private var foreground: Color {
        switch kind {
        case .primary, .danger: .white
        case .success: Palette.onSuccessButton
        case .outline, .dark: Palette.textPrimary
        }
    }

    private struct StyleFor: ViewModifier {
        let kind: Kind
        func body(content: Content) -> some View {
            switch kind {
            case .primary: content.buttonStyle(.glassProminent).tint(Palette.primaryPress)
            case .success: content.buttonStyle(.glassProminent).tint(Palette.success)
            case .danger: content.buttonStyle(.glassProminent).tint(Palette.danger)
            case .outline, .dark: content.buttonStyle(.glass)
            }
        }
    }
}

struct BadgeView: View {
    var text: String
    var background: Color
    var foreground: Color
    var body: some View {
        Text(text)
            .appText(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(background, in: Capsule())
    }
}

extension TripStatus {
    var badgeColors: (Color, Color) {
        let name: String = switch self {
        case .pending: "Yellow"
        case .notified: "Blue"
        case .calling: "Purple"
        case .confirmed: "Green"
        case .rejected, .cancelled, .cancelledByDriver, .noShow: "Red"
        case .noAnswer: "Orange"
        case .arrivedPickup, .pickedUp: "Pink"
        case .completed, .unknown: "Gray"
        }
        return (Color("Badge\(name)Bg"), Color("Badge\(name)Fg"))
    }
}

struct StatusBadge: View {
    var status: TripStatus
    var body: some View {
        let (bg, fg) = status.badgeColors
        BadgeView(text: status.label, background: bg, foreground: fg)
    }
}

struct EmptyStateView: View {
    var systemImage: String
    var title: String
    var message: String?
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: Spacing.s3) {
            Image(systemName: systemImage)
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(Palette.primary)
                .frame(width: 64, height: 64)
                .background(Palette.primaryMuted, in: Circle())
            Text(title).appText(.h2).foregroundStyle(Palette.textPrimary).multilineTextAlignment(.center)
            if let message {
                Text(message).appText(.body).foregroundStyle(Palette.textSecondary).multilineTextAlignment(.center)
            }
            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle).appText(.bodyStrong).padding(.horizontal, 12)
                }
                .buttonStyle(.glass)
                .controlSize(.large)
                .padding(.top, Spacing.s2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.s8)
        .padding(.horizontal, Spacing.s4)
    }
}

/// Pulsing placeholder (Skeleton: opacity 0.55 ↔ 1).
struct SkeletonBlock: View {
    var height: CGFloat
    var radius: CGFloat = Radius.card
    @State private var dim = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(Palette.surfaceVariant)
            .frame(height: height)
            .opacity(dim ? 0.55 : 1)
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { dim = true }
            }
            .accessibilityHidden(true)
    }
}

/// Pickup → dropoff line: 10 pt primary dot, 2 pt line, 10 pt success square.
struct RouteLineView: View {
    var pickup: String
    var dropoff: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.s3) {
            VStack(spacing: 0) {
                Circle().fill(Palette.primary).frame(width: 10, height: 10).padding(.top, 4)
                Rectangle().fill(Palette.borderStrong).frame(width: 2).frame(maxHeight: .infinity)
                RoundedRectangle(cornerRadius: 2).fill(Palette.success).frame(width: 10, height: 10).padding(.bottom, 6)
            }
            VStack(alignment: .leading, spacing: Spacing.s3) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Điểm đón").appText(.caption).foregroundStyle(Palette.textMuted)
                    Text(pickup).appText(.body).foregroundStyle(Palette.textPrimary).fixedSize(horizontal: false, vertical: true)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("Điểm đến").appText(.caption).foregroundStyle(Palette.textMuted)
                    Text(dropoff).appText(.body).foregroundStyle(Palette.textPrimary).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .combine)
    }
}

/// Glossy letter avatar.
struct LetterAvatar: View {
    var name: String
    var size: CGFloat = 44
    var body: some View {
        Text(String(name.trimmingCharacters(in: .whitespaces).first ?? "?").uppercased())
            .font(.system(size: size * 0.42, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(
                Circle().fill(Palette.cta)
                    .overlay(Circle().fill(LinearGradient(colors: [.white.opacity(0.35), .clear], startPoint: .top, endPoint: .center)))
            )
            .shadow(color: Palette.primary.opacity(0.35), radius: size * 0.15, y: size * 0.06)
            .accessibilityHidden(true)
    }
}

/// Segmented control: track surfaceVariant, active pill CTA gradient with white label.
struct SegmentedPills<Value: Hashable>: View {
    var options: [(Value, String)]
    @Binding var selection: Value
    var height: CGFloat = 48
    var identifierPrefix = "segment"
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 4) {
            ForEach(Array(options.enumerated()), id: \.offset) { index, item in
                let selected = item.0 == selection
                Button {
                    withAnimation(.snappy(duration: 0.25)) { selection = item.0 }
                } label: {
                    Text(item.1)
                        .appText(.label)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                        .foregroundStyle(selected ? .white : Palette.textSecondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background {
                            if selected {
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .fill(Palette.cta)
                                    .shadow(color: Palette.primary.opacity(0.35), radius: 6, y: 2)
                                    .matchedGeometryEffect(id: "pill", in: ns)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier("\(identifierPrefix)-\(index)")
            }
        }
        .padding(4)
        .frame(height: height)
        .background(Palette.surfaceVariant, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

/// SearchInput (height 44, radius 14).
struct SearchField: View {
    var placeholder: String
    @Binding var text: String
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(Palette.textMuted)
            TextField(placeholder, text: $text)
                .appText(.body)
                .foregroundStyle(Palette.textPrimary)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
            if !text.isEmpty {
                Button { text = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Palette.textMuted) }
                    .accessibilityLabel("Xoá")
            }
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 44)
        .background(Palette.surfaceElevated, in: RoundedRectangle(cornerRadius: Radius.control, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.control, style: .continuous).strokeBorder(Palette.inputBorder, lineWidth: 1))
    }
}

struct StatCard: View {
    var label: String
    var value: String
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).appText(.caption).foregroundStyle(Palette.textSecondary)
            Text(value).appText(.title).foregroundStyle(Palette.textPrimary).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.s3)
        .background(Palette.surfaceVariant.opacity(0.7), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}

struct SectionTitle: View {
    var text: String
    var body: some View {
        Text(text)
            .appText(.label)
            .foregroundStyle(Palette.textSecondary)
            .textCase(nil)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 4)
            .accessibilityAddTraits(.isHeader)
    }
}

/// Theme toggle (sun / moon, gradient #8B5CF6 → #C084FC).
struct ThemeToggle: View {
    @Environment(Preferences.self) private var prefs
    var body: some View {
        let dark = prefs.theme == .dark
        Button {
            withAnimation(.snappy) { prefs.theme = dark ? .light : .dark }
        } label: {
            ZStack(alignment: dark ? .trailing : .leading) {
                Capsule().fill(LinearGradient(colors: [Palette.primary, Color(hex: 0xC084FC)], startPoint: .leading, endPoint: .trailing))
                    .opacity(dark ? 1 : 0.35)
                Circle().fill(.white).padding(3)
                    .overlay(Image(systemName: dark ? "moon.fill" : "sun.max.fill").font(.system(size: 13, weight: .bold)).foregroundStyle(dark ? Palette.primary : .orange))
                    .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
            }
            .frame(width: 64, height: 34)
            .frame(minWidth: 64, minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Chế độ tối")
        .accessibilityValue(dark ? "Bật" : "Tắt")
        .accessibilityIdentifier("theme-toggle")
    }
}

/// Row with leading icon, title and chevron (profile menus).
struct MenuRow: View {
    var systemImage: String
    var title: String
    var tint: Color = Palette.textPrimary
    var showsChevron = true
    var body: some View {
        HStack(spacing: Spacing.s3) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(tint == Palette.textPrimary ? Palette.primary : tint)
                .frame(width: 34, height: 34)
                .background((tint == Palette.textPrimary ? Palette.primaryMuted : tint.opacity(0.14)), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text(title).appText(.body).foregroundStyle(tint)
            Spacer(minLength: 0)
            if showsChevron {
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(Palette.textMuted)
            }
        }
        .frame(minHeight: 44)
        .contentShape(Rectangle())
    }
}

extension View {
    /// Full-screen themed background.
    func screenBackground() -> some View {
        background(Palette.background.ignoresSafeArea())
    }
}

/// Horizontal stack that splits the width by weights (flex 1 / flex 2).
struct RatioHStack: Layout {
    var weights: [CGFloat]
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 320
        let widths = columnWidths(total: width, count: subviews.count)
        let height = zip(subviews, widths).map { $0.sizeThatFits(ProposedViewSize(width: $1, height: proposal.height)).height }.max() ?? 0
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let widths = columnWidths(total: bounds.width, count: subviews.count)
        var x = bounds.minX
        for (sub, w) in zip(subviews, widths) {
            sub.place(at: CGPoint(x: x, y: bounds.minY), proposal: ProposedViewSize(width: w, height: bounds.height))
            x += w + spacing
        }
    }

    private func columnWidths(total: CGFloat, count: Int) -> [CGFloat] {
        let w = Array(weights.prefix(count)) + Array(repeating: 1, count: max(0, count - weights.count))
        let sum = w.reduce(0, +)
        let available = total - spacing * CGFloat(max(0, count - 1))
        return w.map { available * $0 / sum }
    }
}
