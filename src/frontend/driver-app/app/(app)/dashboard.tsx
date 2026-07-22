import { ScrollView, Switch, RefreshControl } from "react-native";
import { View, XStack, Text, useTheme, useThemeName } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDriverContext } from "../../src/features/dashboard/hooks/useDriverContext";
import { TripSection } from "../../src/features/dashboard/components/TripSection";
import { ActiveTripCard } from "../../src/features/dashboard/components/ActiveTripCard";
import { EmptyTripsState } from "../../src/features/dashboard/components/EmptyTripsState";
import { driversService } from "../../src/services/api/drivers";
import { useCurrentUser } from "../../src/features/auth/hooks/useCurrentUser";
import { PENDING_STATUSES } from "../../src/constants/status";

export default function DashboardScreen() {
  // Profile is fetched (GET /auth/me), not persisted — see authStore.ts and
  // useCurrentUser.ts for why.
  const { data: driver } = useCurrentUser();
  const qc = useQueryClient();

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

  if (!driver) return null;

  const isOnline = driver.status === "online";
  const pending =
    context?.upcoming_trips.filter((t) =>
      PENDING_STATUSES.includes(t.status),
    ) ?? [];
  // A driver can hold more than one active trip at once (e.g. wrapping up a
  // current ride while already confirmed for the next pickup) — active_trips
  // covers every confirmed/arrived_pickup/picked_up trip, unlike current_trip
  // which only ever surfaces a single one.
  const active = context?.active_trips ?? [];

  const screenBackground = isLight ? "#F5F4F8" : theme.surface.val;
  const headerBackground = isLight ? "#F8F8FB" : "#000000";

  return (
    <View flex={1} backgroundColor={screenBackground}>
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
              color={isOnline ? "#5CE77A" : theme.textMuted.val}
            >
              {isOnline ? "Online" : "Offline"}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: theme.borderStrong.val, true: "#5CE77A" }}
              thumbColor={isOnline ? "#1AC94B" : theme.textMuted.val}
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
        {!isLoading && (
          <>
            <TripSection
              title={`Active Trip${active.length > 1 ? "s" : ""} (${active.length})`}
              trips={active}
              renderItem={(trip) => <ActiveTripCard trip={trip} />}
            />
            <TripSection
              title={`Trip Requests (${pending.length})`}
              trips={pending}
            />
            {pending.length === 0 && active.length === 0 && (
              <EmptyTripsState isOnline={isOnline} />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
