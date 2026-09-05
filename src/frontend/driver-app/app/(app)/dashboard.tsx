import { useState } from "react";
import { XStack, YStack } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Screen } from "../../src/components/Screen";
import { AppText } from "../../src/components/AppText";
import { Skeleton } from "../../src/components/Skeleton";
import { Toggle } from "../../src/components/Toggle";
import { SegmentedControl } from "../../src/components/SegmentedControl";
import { useDriverContext } from "../../src/features/dashboard/hooks/useDriverContext";
import { useProximityTracking } from "../../src/features/dashboard/hooks/useProximityTracking";
import { ActiveTripCard } from "../../src/features/dashboard/components/ActiveTripCard";
import { OptimizedRouteCard } from "../../src/features/dashboard/components/OptimizedRouteCard";
import { TripCard } from "../../src/features/dashboard/components/TripCard";
import { EmptyTripsState } from "../../src/features/dashboard/components/EmptyTripsState";
import { EmptyState } from "../../src/components/EmptyState";
import { DeliveryOrderCard } from "../../src/features/delivery/components/DeliveryOrderCard";
import { EmptyDeliveryState } from "../../src/features/delivery/components/EmptyDeliveryState";
import { GlassButton } from "../../src/components/GlassButton";
import { SearchInput } from "../../src/components/SearchInput";
import { useDeliveryOrders } from "../../src/features/delivery/hooks/useDeliveryOrders";
import { driversService } from "../../src/services/api/drivers";
import { useCurrentUser } from "../../src/features/auth/hooks/useCurrentUser";
import { PENDING_STATUSES, DELIVERY_ACTIVE_STATUSES } from "../../src/constants/status";

type DashboardMode = "trips" | "delivery";
// "Chưa xác nhận" (pending/notified/calling) → "Đang chạy" (confirmed →
// arrived_pickup → picked_up) → "Đã hoàn thành" (completed). Accepting a
// pending trip or completing an active one just moves it between these tabs
// on the next driverContext refetch — no separate "move" action needed.
type TripStatusTab = "pending" | "active" | "completed";
// "Đang giao" (pending/picked_up/delivering/redelivery) → "Đã giao"
// (delivered). Same idea as TripStatusTab: a status update just moves the
// order between tabs on the next refetch.
type DeliveryStatusTab = "active" | "delivered";

/**
 * Sticky chrome (greeting, mode, search, status tabs); only the card list scrolls.
 * Same pattern as Thu nhập (`earnings.tsx`).
 */
export default function DashboardScreen() {
  // Profile is fetched (GET /auth/me), not persisted — see authStore.ts and
  // useCurrentUser.ts for why.
  const { data: driver } = useCurrentUser();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<DashboardMode>("trips");
  const [tripStatusTab, setTripStatusTab] = useState<TripStatusTab>("active");
  const [deliveryStatusTab, setDeliveryStatusTab] =
    useState<DeliveryStatusTab>("active");
  const [tripQuery, setTripQuery] = useState("");
  const [deliveryQuery, setDeliveryQuery] = useState("");
  const {
    data: deliveryOrders = [],
    isError: isDeliveryError,
    refetch: refetchDelivery,
  } = useDeliveryOrders();

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
      await Promise.all([refetch(), refetchDelivery()]);
    } finally {
      setPullRefreshing(false);
    }
  };
  const showTripSkeleton = isLoading && !context;

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver!.phone, {
        status: online ? "online" : "offline",
      }),
    // Flips the switch immediately instead of waiting on the PATCH round trip
    // — without this the toggle (bound to ['me']) only moves once the response
    // comes back, which reads as laggy. Rolled back on failure.
    onMutate: async (online) => {
      await qc.cancelQueries({ queryKey: ["me"] });
      const previous = qc.getQueryData(["me"]);
      qc.setQueryData(["me"], (old: typeof driver) =>
        old ? { ...old, status: online ? "online" : "offline" } : old,
      );
      return { previous };
    },
    onError: (_err, _online, ctx) => {
      if (ctx?.previous) qc.setQueryData(["me"], ctx.previous);
    },
    onSuccess: (d) => {
      qc.setQueryData(["me"], d);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["driverContext"] });
    },
  });

  const active = context?.active_trips ?? [];
  const isOnline = driver?.status === "online";
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

  const matchesDeliveryQuery = (o: {
    sender_phone?: string;
    recipient_phone: string;
  }) => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      o.sender_phone?.toLowerCase().includes(q) ||
      o.recipient_phone?.toLowerCase().includes(q)
    );
  };
  const deliveryActive = deliveryOrders.filter((o) =>
    DELIVERY_ACTIVE_STATUSES.includes(o.status),
  );
  const deliveryDelivered = deliveryOrders.filter(
    (o) => o.status === "delivered",
  );
  const filteredDeliveryActive = deliveryActive.filter(matchesDeliveryQuery);
  const filteredDeliveryDelivered =
    deliveryDelivered.filter(matchesDeliveryQuery);

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
        <YStack flex={1}>
          <AppText variant="caption" color="$textSecondary">
            Xin chào
          </AppText>
          <AppText variant="h1" numberOfLines={1}>
            {driver.name}
          </AppText>
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

      <SegmentedControl<DashboardMode>
        value={mode}
        onChange={(next) => {
          setMode(next);
          if (next === "trips") setTripQuery("");
          else setDeliveryQuery("");
        }}
        options={[
          { value: "trips", label: "Chuyến đi", icon: "car-sport" },
          { value: "delivery", label: "Giao hàng", icon: "cube" },
        ]}
      />

      <SearchInput
        value={mode === "trips" ? tripQuery : deliveryQuery}
        onChangeText={mode === "trips" ? setTripQuery : setDeliveryQuery}
        placeholder={
          mode === "trips"
            ? "Tìm theo tên hoặc số điện thoại..."
            : "Tìm theo SĐT người gửi/nhận..."
        }
      />

      {mode === "trips" ? (
        <>
          <GlassButton
            label="+ Thêm chuyến (vãng lai)"
            onPress={() => router.push("/add-trip")}
          />
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
        </>
      ) : (
        <>
          <GlassButton
            label="+ Thêm đơn hàng"
            onPress={() => router.push("/add-delivery")}
          />
          {deliveryOrders.length > 0 ? (
            <SegmentedControl<DeliveryStatusTab>
              value={deliveryStatusTab}
              onChange={setDeliveryStatusTab}
              options={[
                {
                  value: "active",
                  label: `Đang giao (${deliveryActive.length})`,
                },
                {
                  value: "delivered",
                  label: `Đã giao (${deliveryDelivered.length})`,
                },
              ]}
            />
          ) : null}
        </>
      )}
    </YStack>
  );

  return (
    <Screen
      scroll
      header={header}
      refreshing={pullRefreshing}
      onRefresh={onPullRefresh}
    >
      {mode === "trips" && showTripSkeleton && (
        <YStack gap="$4">
          <Skeleton height={120} radius={24} />
          <Skeleton height={120} radius={24} />
        </YStack>
      )}

      {mode === "trips" && !showTripSkeleton && isError && (
        <EmptyState
          icon="alert-circle-outline"
          title="Không thể tải chuyến đi"
          message="Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại."
          actionLabel="Thử lại"
          onAction={refetch}
        />
      )}

      {mode === "trips" && !showTripSkeleton && !isError && context && (
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

      {mode === "delivery" && isDeliveryError && (
        <EmptyState
          icon="alert-circle-outline"
          title="Không thể tải đơn hàng"
          message="Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại."
          actionLabel="Thử lại"
          onAction={refetchDelivery}
        />
      )}

      {mode === "delivery" && !isDeliveryError && (
        <>
          {deliveryOrders.length === 0 ? (
            <EmptyDeliveryState />
          ) : (
            <>
              {deliveryStatusTab === "active" &&
                (deliveryActive.length === 0 ? (
                  <NoDeliveryMatch text="Không có đơn nào đang giao" />
                ) : filteredDeliveryActive.length === 0 ? (
                  <NoDeliveryMatch text="Không tìm thấy đơn hàng phù hợp" />
                ) : (
                  <YStack gap="$4">
                    {filteredDeliveryActive.map((order) => (
                      <DeliveryOrderCard
                        key={order.order_id}
                        order={order}
                      />
                    ))}
                  </YStack>
                ))}

              {deliveryStatusTab === "delivered" &&
                (deliveryDelivered.length === 0 ? (
                  <NoDeliveryMatch text="Chưa có đơn nào đã giao" />
                ) : filteredDeliveryDelivered.length === 0 ? (
                  <NoDeliveryMatch text="Không tìm thấy đơn hàng phù hợp" />
                ) : (
                  <YStack gap="$4">
                    {filteredDeliveryDelivered.map((order) => (
                      <DeliveryOrderCard
                        key={order.order_id}
                        order={order}
                      />
                    ))}
                  </YStack>
                ))}
            </>
          )}
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

function NoDeliveryMatch({ text }: { text: string }) {
  return (
    <AppText
      variant="body"
      color="$textSecondary"
      textAlign="center"
      paddingVertical="$4"
    >
      {text}
    </AppText>
  );
}
