import Charts
import SwiftUI

enum EarningsPeriod: String, Hashable { case today, week, month }

/// Grouping / filtering helpers (`CompletedTripEarningsList.tsx`).
enum EarningsMath {
    struct DayGroup: Identifiable {
        var heading: String
        var total: Double
        var trips: [Trip]
        var id: String { heading }
    }

    static func completedAt(_ t: Trip) -> Date? { Fmt.parseISO(t.updatedAt ?? t.createdAt ?? "") }

    static func dayHeading(_ date: Date?, now: Date = Date(), calendar: Calendar = .current) -> String {
        guard let date else { return "Khác" }
        let diff = calendar.dateComponents([.day], from: calendar.startOfDay(for: date), to: calendar.startOfDay(for: now)).day ?? 0
        if diff == 0 { return "Hôm nay" }
        if diff == 1 { return "Hôm qua" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "vi_VN")
        f.dateFormat = "EEEE, dd/MM"
        return f.string(from: date)
    }

    static func filter(_ trips: [Trip], period: EarningsPeriod, now: Date = Date()) -> [Trip] {
        let from: Date = switch period {
        case .today: Calendar.current.startOfDay(for: now)
        case .week: now.addingTimeInterval(-7 * 86400)
        case .month: now.addingTimeInterval(-30 * 86400)
        }
        return trips.filter { (completedAt($0) ?? .distantPast) >= from }
            .sorted { (completedAt($0) ?? .distantPast) > (completedAt($1) ?? .distantPast) }
    }

    static func group(_ trips: [Trip], now: Date = Date()) -> [DayGroup] {
        var groups: [DayGroup] = []
        for t in trips {
            let heading = dayHeading(completedAt(t), now: now)
            if let last = groups.indices.last, groups[last].heading == heading {
                groups[last].trips.append(t)
                groups[last].total += t.estimatedFare ?? 0
            } else {
                groups.append(DayGroup(heading: heading, total: t.estimatedFare ?? 0, trips: [t]))
            }
        }
        return groups
    }

    struct DayBar: Identifiable {
        var date: Date
        var label: String
        var total: Double
        var isToday: Bool
        var id: Date { date }
    }

    /// Last 7 days ending today; labels CN, T2..T7.
    static func week(_ trips: [Trip], now: Date = Date(), calendar: Calendar = .current) -> [DayBar] {
        let today = calendar.startOfDay(for: now)
        return (0..<7).reversed().map { offset in
            let day = calendar.date(byAdding: .day, value: -offset, to: today)!
            let total = trips.filter { completedAt($0).map { calendar.isDate($0, inSameDayAs: day) } ?? false }
                .reduce(0) { $0 + ($1.estimatedFare ?? 0) }
            let wd = calendar.component(.weekday, from: day) // 1 = Sunday
            return DayBar(date: day, label: wd == 1 ? "CN" : "T\(wd)", total: total, isToday: offset == 0)
        }
    }
}

/// "Thu nhập": hero, weekly chart, searchable history.
struct EarningsView: View {
    @Environment(AppModel.self) private var model
    @Binding var selection: AppTab
    @State private var period: EarningsPeriod = .today
    @State private var query = ""

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Spacing.s4, pinnedViews: [.sectionHeaders]) {
                Section {
                    content.padding(.horizontal, Spacing.gutter)
                } header: {
                    VStack(alignment: .leading, spacing: Spacing.s3) {
                        Text("Thu nhập").appText(.h1).foregroundStyle(Palette.textPrimary).accessibilityAddTraits(.isHeader)
                        hero
                    }
                    .padding(.horizontal, Spacing.gutter)
                    .padding(.top, Spacing.s2)
                    .padding(.bottom, Spacing.s2)
                    .background(Palette.background)
                }
            }
            .padding(.bottom, 120)
        }
        .refreshable {
            await model.loadContext(fresh: true)
            if period != .today { await model.loadEarnings(period.rawValue) }
        }
        .screenBackground()
        .toolbar(.hidden, for: .navigationBar)
        .task(id: period) { if period != .today { await model.loadEarnings(period.rawValue) } }
    }

    private var totals: (total: Double?, count: Int?, hours: Double?, bonus: Double?) {
        if period == .today {
            let t = model.context?.todayEarnings
            return (t?.totalEarnings, t?.tripCount, t?.hoursOnline, t?.bonusEarnings)
        }
        let s = model.earnings[period.rawValue]
        return (s?.totalEarnings, s?.tripCount, nil, nil)
    }

    private var hero: some View {
        let t = totals
        let isError = period == .today ? (model.contextError && model.context == nil) : model.earningsError.contains(period.rawValue)
        return VStack(alignment: .leading, spacing: Spacing.s4) {
            SegmentedPills(options: [(EarningsPeriod.today, "Hôm nay"), (.week, "7 ngày"), (.month, "30 ngày")], selection: $period, identifierPrefix: "earnings-period")
            if isError {
                Button {
                    Task { period == .today ? await model.loadContext(fresh: true) : await model.loadEarnings(period.rawValue) }
                } label: {
                    Text("Không thể tải dữ liệu. Nhấn để thử lại.").appText(.body).foregroundStyle(Palette.textSecondary).frame(minHeight: 44)
                }
            } else if let total = t.total, let count = t.count {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tổng thu nhập").appText(.label).foregroundStyle(Palette.textSecondary)
                    Text(Fmt.currency(total)).appText(.display).font(.system(size: 34, weight: .bold)).foregroundStyle(Palette.textPrimary)
                        .lineLimit(1).minimumScaleFactor(0.6).contentTransition(.numericText()).accessibilityIdentifier("earnings-total")
                }
                HStack(spacing: Spacing.s2) {
                    StatCard(label: "Chuyến", value: "\(count)")
                    StatCard(label: "TB/chuyến", value: count > 0 ? Fmt.currency((total / Double(count)).rounded()) : "—")
                    if period == .today {
                        StatCard(label: "Giờ online", value: t.hours.map { "\(Fmt.decimal($0)) giờ" } ?? "—")
                    } else {
                        StatCard(label: "Thưởng", value: t.bonus.map { Fmt.currency($0) } ?? "—")
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    SkeletonBlock(height: 34, radius: 8).frame(width: 200)
                    SkeletonBlock(height: 14, radius: 6).frame(width: 140)
                }
            }
        }
        .padding(Spacing.s4)
        .background(Palette.surfaceElevated, in: RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .overlay(alignment: .topTrailing) {
            Circle().fill(Palette.primary.opacity(0.18)).frame(width: 160, height: 160).blur(radius: 50).offset(x: 40, y: -40).allowsHitTesting(false)
        }
        .clipShape(RoundedRectangle(cornerRadius: Radius.card, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 12, y: 4)
    }

    @ViewBuilder
    private var content: some View {
        if model.context == nil && model.contextError {
            EmptyStateView(systemImage: "exclamationmark.circle", title: "Không thể tải thu nhập", message: "Kiểm tra kết nối rồi thử lại.", actionTitle: "Thử lại") {
                Task { await model.loadContext(fresh: true) }
            }
        } else if let ctx = model.context {
            WeeklyEarningsChart(bars: EarningsMath.week(ctx.completedTrips))
            let all = ctx.completedTrips
            if all.isEmpty {
                EmptyStateView(systemImage: "wallet.bifold", title: "Chưa có thu nhập",
                               message: model.isOnline ? "Hoàn thành chuyến đầu tiên để thấy thu nhập ở đây." : "Bật nhận chuyến để bắt đầu kiếm tiền hôm nay.",
                               actionTitle: model.isOnline ? nil : "Bật nhận chuyến") {
                    Task { await model.setOnline(true) }
                }
            } else {
                history(all)
            }
        } else {
            SkeletonBlock(height: 200)
            SkeletonBlock(height: 160)
        }
    }

    @ViewBuilder
    private func history(_ all: [Trip]) -> some View {
        let inPeriod = EarningsMath.filter(all, period: period)
        let shown = inPeriod.filter { ViSearch.matches(query, [$0.customerName, $0.pickupAddress, $0.dropoffAddress]) }
        VStack(alignment: .leading, spacing: Spacing.s3) {
            HStack(alignment: .firstTextBaseline) {
                Text("Lịch sử").appText(.h2).foregroundStyle(Palette.textPrimary)
                Spacer()
                Text(query.isEmpty ? "\(shown.count)/\(all.count) chuyến gần đây" : "\(shown.count)/\(inPeriod.count) chuyến khớp “\(query)”")
                    .appText(.caption).foregroundStyle(Palette.textSecondary)
            }
            SearchField(placeholder: "Tìm theo tên khách hoặc địa chỉ...", text: $query)
            if shown.isEmpty {
                Text(query.isEmpty ? "Chưa có chuyến hoàn thành trong khoảng thời gian này." : "Không tìm thấy chuyến khớp “\(query)”.")
                    .appText(.body).foregroundStyle(Palette.textSecondary).padding(.vertical, Spacing.s4)
            }
            ForEach(EarningsMath.group(shown)) { group in
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text(group.heading.prefix(1).uppercased() + group.heading.dropFirst()).appText(.label).fontWeight(.semibold).foregroundStyle(Palette.textSecondary)
                        Spacer()
                        Text(Fmt.currency(group.total)).appText(.label).fontWeight(.semibold).foregroundStyle(Palette.primary)
                    }
                    .padding(.bottom, Spacing.s2)
                    ForEach(Array(group.trips.enumerated()), id: \.element.id) { index, trip in
                        HStack(spacing: Spacing.s3) {
                            Image(systemName: "checkmark").font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.success)
                                .frame(width: 32, height: 32).background(Palette.successContainer, in: Circle())
                            VStack(alignment: .leading, spacing: 2) {
                                Text(trip.displayName).appText(.bodyStrong).foregroundStyle(Palette.textPrimary).lineLimit(1)
                                Text("\(Fmt.time(trip.updatedAt ?? "")) · \(Fmt.km(trip.distanceKm)) · \(trip.dropoffAddress)")
                                    .appText(.caption).foregroundStyle(Palette.textSecondary).lineLimit(1)
                            }
                            Spacer(minLength: 0)
                            Text(Fmt.currency(trip.estimatedFare ?? 0)).appText(.bodyStrong).foregroundStyle(Palette.textPrimary)
                        }
                        .padding(.vertical, 10)
                        .accessibilityElement(children: .combine)
                        if index < group.trips.count - 1 { Divider().overlay(Palette.divider) }
                    }
                }
                .surfaceCard(shadow: false)
            }
        }
    }
}

/// "7 ngày qua" bar chart: today primary, days with earnings primaryContainer, empty days chip.
struct WeeklyEarningsChart: View {
    var bars: [EarningsMath.DayBar]

    var body: some View {
        let best = bars.max { $0.total < $1.total }
        VStack(alignment: .leading, spacing: Spacing.s3) {
            VStack(alignment: .leading, spacing: 2) {
                Text("7 ngày qua").appText(.h2).foregroundStyle(Palette.textPrimary)
                if let best, best.total > 0 {
                    Text("Cao nhất \(best.label): \(Fmt.currency(best.total))").appText(.caption).foregroundStyle(Palette.textSecondary)
                } else {
                    Text("Chưa có chuyến nào trong 7 ngày").appText(.caption).foregroundStyle(Palette.textSecondary)
                }
            }
            Chart(bars) { bar in
                BarMark(x: .value("Ngày", bar.label), y: .value("Thu nhập", max(bar.total, bestFloor(best?.total))))
                    .foregroundStyle(bar.isToday ? AnyShapeStyle(Palette.cta) : AnyShapeStyle(bar.total > 0 ? Palette.primaryContainer : Palette.surfaceVariant))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
            .chartYAxis(.hidden)
            .chartXAxis {
                AxisMarks { _ in
                    AxisValueLabel().font(.system(size: 12, weight: .medium)).foregroundStyle(Palette.textSecondary)
                }
            }
            .frame(height: 150)
            .accessibilityLabel("Biểu đồ thu nhập 7 ngày qua")
        }
        .surfaceCard()
    }

    /// Empty days still show a short stub bar.
    private func bestFloor(_ best: Double?) -> Double { (best ?? 0) * 0.04 }
}
