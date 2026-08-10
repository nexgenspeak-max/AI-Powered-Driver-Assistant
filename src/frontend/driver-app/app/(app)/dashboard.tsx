import { useState } from "react";
import { ScrollView, Switch, RefreshControl } from "react-native";
import { View, XStack, YStack, Text, useTheme, useThemeName } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useDriverContext } from "../../src/features/dashboard/hooks/useDriverContext";
import { useProximityTracking } from "../../src/features/dashboard/hooks/useProximityTracking";
import { TripSection } from "../../src/features/dashboard/components/TripSection";
import { ActiveTripCard } from "../../src/features/dashboard/components/ActiveTripCard";
import { EmptyTripsState } from "../../src/features/dashboard/components/EmptyTripsState";
import {
  DashboardModeSwitch,
  type DashboardMode,
} from "../../src/features/dashboard/components/DashboardModeSwitch";
import { DeliveryOrderCard } from "../../src/features/delivery/components/DeliveryOrderCard";
import { EmptyDeliveryState } from "../../src/features/delivery/components/EmptyDeliveryState";
import { GlassButton } from "../../src/components/GlassButton";
import { SearchInput } from "../../src/components/SearchInput";
import { useDeliveryOrders } from "../../src/features/delivery/hooks/useDeliveryOrders";
import { driversService } from "../../src/services/api/drivers";
import { useCurrentUser } from "../../src/features/auth/hooks/useCurrentUser";
import { PENDING_STATUSES } from "../../src/constants/status";

export default function DashboardScreen() {
  // Profile is fetched (GET /auth/me), not persisted — see authStore.ts and
  // useCurrentUser.ts for why.
  const { data: driver } = useCurrentUser();
  const qc = useQueryClient();
  const [mode, setMode] = useState<DashboardMode>("trips");
  const [tripQuery, setTripQuery] = useState("");
  const [deliveryQuery, setDeliveryQuery] = useState("");
  const { data: deliveryOrders = [] } = useDeliveryOrders();

  const {
    data: context,
    isLoading,
    isRefetching,
    refetch,
  } = useDriverContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isLight = useThemeName() === "light";

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver!.phone, {
        status: online ? "online" : "offline",
      }),
    onSuccess: (d) => {
      // Updates the same ['me'] cache useCurrentUser() reads from, in place
      // — no separate driver-profile store to keep in sync anymore.
      qc.setQueryData(["me"], d);
      qc.invalidateQueries({ queryKey: ["driverContext"] });
    },
  });

  // A driver can hold more than one active trip at once (e.g. wrapping up a
  // current ride while already confirmed for the next pickup) — active_trips
  // covers every confirmed/arrived_pickup/picked_up trip, unlike current_trip
  // which only ever surfaces a single one.
  const active = context?.active_trips ?? [];
  const isOnline = driver?.status === "online";
  // Called unconditionally, above the `!driver` early return below — hooks
  // can't be called after a conditional return (Rules of Hooks). Tracks
  // for as long as the driver is online, regardless of trip status (see
  // useProximityTracking.ts).
  useProximityTracking(isOnline);

  if (!driver) return null;
  const pending =
    context?.upcoming_trips.filter((t) =>
      PENDING_STATUSES.includes(t.status),
    ) ?? [];

  const matchesTripQuery = (t: { customer_name: string; customer_phone: string }) => {
    const q = tripQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.customer_name?.toLowerCase().includes(q) ||
      t.customer_phone?.toLowerCase().includes(q)
    );
  };
  const filteredActive = active.filter(matchesTripQuery);
  const filteredPending = pending.filter(matchesTripQuery);

  const filteredDeliveryOrders = deliveryOrders.filter((o) => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      o.sender_phone?.toLowerCase().includes(q) ||
      o.recipient_phone?.toLowerCase().includes(q)
    );
  });

  const headerBackground = isLight ? "#F8F8FB" : theme.surfaceElevated.val;

  return (
    <View flex={1} backgroundColor="$surface">
      <View
        backgroundColor={headerBackground}
        paddingHorizontal="$5"
        paddingTop={insets.top + 16}
        paddingBottom="$4"
      >
        <XStack alignItems="center" justifyContent="space-between">
          <View>
            <Text
              color={isLight ? "$textPrimary" : "$textInverse"}
              fontWeight="700"
              fontSize="$5"
            >
              {driver.name}
            </Text>
            <Text
              color={isLight ? "$textSecondary" : "$textSecondary"}
              fontSize="$1"
            >
              {driver.phone}
            </Text>
          </View>
          <XStack alignItems="center" gap="$2">
            <Text
              fontSize="$1"
              fontWeight="500"
              color={isOnline ? theme.success.val : theme.textMuted.val}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: theme.borderStrong.val, true: theme.success.val }}
              thumbColor={isOnline ? theme.success.val : theme.textMuted.val}
            />
          </XStack>
        </XStack>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <YStack gap="$3">
          <DashboardModeSwitch mode={mode} onChange={setMode} />
          <SearchInput
            value={mode === "trips" ? tripQuery : deliveryQuery}
            onChangeText={mode === "trips" ? setTripQuery : setDeliveryQuery}
            placeholder={
              mode === "trips"
                ? "Tìm theo tên hoặc số điện thoại..."
                : "Tìm theo số điện thoại người gửi/nhận..."
            }
          />
        </YStack>

        {mode === "trips" && !isLoading && (
          <>
            <TripSection
              title={`Active Trip${filteredActive.length > 1 ? "s" : ""} (${filteredActive.length})`}
              trips={filteredActive}
              renderItem={(trip) => <ActiveTripCard trip={trip} />}
            />
            <TripSection
              title={`Trip Requests (${filteredPending.length})`}
              trips={filteredPending}
            />
            {pending.length === 0 && active.length === 0 && (
              <EmptyTripsState isOnline={isOnline} />
            )}
            {(pending.length > 0 || active.length > 0) &&
              filteredPending.length === 0 &&
              filteredActive.length === 0 && (
                <Text color="$textSecondary" fontSize="$2" textAlign="center" paddingVertical="$4">
                  Không tìm thấy chuyến đi phù hợp
                </Text>
              )}
          </>
        )}

        {mode === "delivery" && (
          <YStack gap="$4">
            <GlassButton
              label="+ Thêm đơn hàng"
              onPress={() => router.push("/add-delivery")}
            />
            {deliveryOrders.length === 0 ? (
              <EmptyDeliveryState />
            ) : filteredDeliveryOrders.length === 0 ? (
              <Text color="$textSecondary" fontSize="$2" textAlign="center" paddingVertical="$4">
                Không tìm thấy đơn hàng phù hợp
              </Text>
            ) : (
              <YStack gap="$4">
                {filteredDeliveryOrders.map((order) => (
                  <DeliveryOrderCard key={order.order_id} order={order} />
                ))}
              </YStack>
            )}
          </YStack>
        )}
      </ScrollView>
    </View>
  );
}
