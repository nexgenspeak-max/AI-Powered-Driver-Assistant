import { useState } from "react";
import { Pressable } from "react-native";
import { XStack, YStack, useTheme } from "tamagui";
import { Icon } from "../../src/components/icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { AppText } from "../../src/components/AppText";
import { Skeleton } from "../../src/components/Skeleton";
import { Toggle } from "../../src/components/Toggle";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { useDriverContext } from "../../src/features/dashboard/hooks/useDriverContext";
import { useProximityTracking } from "../../src/features/dashboard/hooks/useProximityTracking";
import { useOnlineToggle } from "../../src/features/dashboard/hooks/useOnlineToggle";
import { ActiveTripCard } from "../../src/features/dashboard/components/ActiveTripCard";
import { OptimizedRouteCard } from "../../src/features/dashboard/components/OptimizedRouteCard";
import { TripCard } from "../../src/features/dashboard/components/TripCard";
import { EmptyTripsState } from "../../src/features/dashboard/components/EmptyTripsState";
import { EmptyState } from "../../src/components/EmptyState";
import { SearchInput } from "../../src/components/SearchInput";
import { useCurrentUser } from "../../src/features/auth/hooks/useCurrentUser";
import { PENDING_STATUSES } from "../../src/constants/status";
import { formatCurrency } from "../../src/utils/format";

// "Chưa xác nhận" (pending/notified/calling) → "Đang chạy" (confirmed →
// arrived_pickup → picked_up) → "Đã hoàn thành" (completed). Accepting a
// pending trip or completing an active one just moves it between these tabs
// on the next driverContext refetch — no separate "move" action needed.
type TripStatusTab = "pending" | "active" | "completed";

/**
 * Sticky chrome (greeting, search, status tabs); only the card list scrolls.
 * Same pattern as Thu nhập (`earnings.tsx`).
 */
export default function DashboardScreen() {
  // Profile is fetched (GET /auth/me), not persisted — see authStore.ts and
  // useCurrentUser.ts for why.
  const { data: driver } = useCurrentUser();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [tripStatusTab, setTripStatusTab] = useState<TripStatusTab>("active");
  const [tripQuery, setTripQuery] = useState("");

  const {
    data: context,
    isLoading,
    isError,
    refetch,
  } = useDriverContext();
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const onPullRefresh = async () => {
    setPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  };
  const showTripSkeleton = isLoading && !context;

  const { isOnline, setOnline: toggleOnline } = useOnlineToggle();

  const active = context?.active_trips ?? [];
  // Called unconditionally, above the `!driver` early return below (Rules of
  // Hooks). Tracks while the driver is online, regardless of trip status.
  useProximityTracking(isOnline);

  if (!driver) {
    return (
      <Screen scroll>
        <YStack gap="$4">
          <Skeleton height={48} width="55%" radius={12} />
          <Skeleton height={48} radius={14} />
          <Skeleton height={44} radius={12} />
          <Skeleton height={120} radius={24} />
          <Skeleton height={120} radius={24} />
        </YStack>
      </Screen>
    );
  }
  const pending =
    context?.upcoming_trips.filter((t) =>
      PENDING_STATUSES.includes(t.status),
    ) ?? [];

  const matchesTripQuery = (t: {
    customer_name: string;
    customer_phone: string;
  }) => {
    const q = tripQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.customer_name?.toLowerCase().includes(q) ||
      t.customer_phone?.toLowerCase().includes(q)
    );
  };
  const completed = context?.completed_trips ?? [];
  const filteredActive = active.filter(matchesTripQuery);
  const filteredPending = pending.filter(matchesTripQuery);
  const filteredCompleted = completed.filter(matchesTripQuery);

  const header = (
    <YStack
      backgroundColor="$background"
      paddingTop={insets.top + 12}
      paddingHorizontal="$5"
      paddingBottom="$3"
      gap="$3"
      borderBottomWidth={1}
      borderBottomColor="$border"
    >
      <XStack alignItems="center" justifyContent="space-between" gap="$3">
        <YStack flex={1} gap={2}>
          <AppText variant="caption" color="$textSecondary">
            Xin chào
          </AppText>
          <AppText variant="h1" numberOfLines={1}>
            {driver.name}
          </AppText>
          {context?.today_earnings ? (
            <AppText variant="label" color="$textSecondary" numberOfLines={1}>
              Hôm nay {formatCurrency(context.today_earnings.total_earnings, context.today_earnings.currency)}
              {" · "}
              {context.today_earnings.trip_count} chuyến xong
            </AppText>
          ) : null}
        </YStack>
        <XStack alignItems="center" gap="$2">
          <AppText
            variant="label"
            color={isOnline ? "$success" : "$textMuted"}
          >
            {isOnline ? "Đang bật" : "Đang tắt"}
          </AppText>
          <Toggle
            value={!!isOnline}
            onValueChange={toggleOnline}
            accessibilityLabel="Trạng thái sẵn sàng nhận chuyến"
          />
        </XStack>
      </XStack>

      <XStack alignItems="center" gap="$3">
        <YStack flex={1}>
          <SearchInput
            value={tripQuery}
            onChangeText={setTripQuery}
            placeholder="Tìm theo tên hoặc số điện thoại..."
          />
        </YStack>
        {/* Walk-up trips are the exception, not the main action — a compact
            icon button instead of a full-width gradient CTA above the list. */}
        <Pressable
          onPress={() => router.push("/add-trip")}
          accessibilityRole="button"
          accessibilityLabel="Thêm chuyến tự tạo"
          hitSlop={6}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.primaryContainer.val,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon name="plus" size={24} color={theme.onPrimaryContainer.val} />
        </Pressable>
      </XStack>
      {/* Short labels, no icons — 3 segments is already tight; an icon +
          "Chưa xác nhận (12)" wrapped to 2 lines inside the control's
          fixed height and visually overlapped the neighboring segment. */}
      <SegmentedControl<TripStatusTab>
        value={tripStatusTab}
        onChange={setTripStatusTab}
        options={[
          { value: "pending", label: `Chờ (${pending.length})` },
          { value: "active", label: `Đang chạy (${active.length})` },
          { value: "completed", label: `Xong (${completed.length})` },
        ]}
      />
    </YStack>
  );

  return (
    <Screen
      scroll
      header={header}
      refreshing={pullRefreshing}
      onRefresh={onPullRefresh}
    >
      {showTripSkeleton && (
        <YStack gap="$4">
          <Skeleton height={120} radius={24} />
          <Skeleton height={120} radius={24} />
        </YStack>
      )}

      {!showTripSkeleton && isError && (
        <EmptyState
          icon="alert-circle"
          title="Không thể tải chuyến đi"
          message="Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      )}

      {!showTripSkeleton && !isError && context && (
        <>
          {tripStatusTab === "pending" &&
            (pending.length === 0 ? (
              <EmptyTripsState isOnline={isOnline} />
            ) : filteredPending.length === 0 ? (
              <NoSearchMatch />
            ) : (
              <YStack gap="$4">
                {filteredPending.map((trip) => (
                  <TripCard key={trip.trip_id} trip={trip} />
                ))}
              </YStack>
            ))}

          {tripStatusTab === "active" &&
            (active.length === 0 ? (
              <EmptyTripsState isOnline={isOnline} />
            ) : filteredActive.length === 0 ? (
              <NoSearchMatch />
            ) : (
              <YStack gap="$4">
                {context.optimized_route ? (
                  <OptimizedRouteCard route={context.optimized_route} />
                ) : null}
                {filteredActive.map((trip) => (
                  <ActiveTripCard key={trip.trip_id} trip={trip} />
                ))}
              </YStack>
            ))}

          {tripStatusTab === "completed" &&
            (completed.length === 0 ? (
              <AppText
                variant="body"
                color="$textSecondary"
                textAlign="center"
                paddingVertical="$6"
              >
                Chưa có chuyến nào hoàn thành
              </AppText>
            ) : filteredCompleted.length === 0 ? (
              <NoSearchMatch />
            ) : (
              <YStack gap="$4">
                {filteredCompleted.map((trip) => (
                  <ActiveTripCard key={trip.trip_id} trip={trip} />
                ))}
              </YStack>
            ))}
        </>
      )}
    </Screen>
  );
}

function NoSearchMatch() {
  return (
    <AppText
      variant="body"
      color="$textSecondary"
      textAlign="center"
      paddingVertical="$4"
    >
      Không tìm thấy chuyến đi phù hợp
    </AppText>
  );
}
