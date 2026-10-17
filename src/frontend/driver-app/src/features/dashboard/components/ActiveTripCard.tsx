import { Alert, Linking } from "react-native";
import { XStack, YStack, View, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { TripMetaRow } from "./TripMetaRow";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Surface } from "../../../components/Surface";
import { AppText } from "../../../components/AppText";
import { RouteLine } from "../../../components/RouteLine";
import { Button } from "../../../components/Button";
import { TripProgressStepper } from "./TripProgressStepper";
import { tripsService } from "../../../services/api/trips";
import { confirmDestructive } from "../../../utils/confirmDialog";
import { formatCurrency } from "../../../utils/format";
import { getCurrentCoords } from "../../../utils/currentLocation";
import { haptics } from "../../../utils/haptics";
import type { Trip } from "../../../types";

// Backend rejects arrived_pickup/picked_up/completed (409) with a
// human-readable `detail` when the driver's GPS is too far from the
// pickup/dropoff point (see trips.ts's ARRIVAL_LOCATION_TARGET) — this is
// what actually surfaces that message to the driver instead of a generic
// "request failed".
function arrivalErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
  return detail || "Không thể xác nhận, vui lòng thử lại.";
}

const NEXT_ACTION: Record<
  string,
  { label: string; variant: "outline" | "success" }
> = {
  confirmed: { label: "Đã đến điểm đón", variant: "outline" },
  arrived_pickup: { label: "Đã đón khách", variant: "outline" },
  picked_up: { label: "Hoàn thành chuyến", variant: "success" },
  // Card briefly still renders with this status in the window between
  // "Hoàn thành chuyến" succeeding and the invalidated driverContext refetch
  // actually removing it from active_trips — without an entry here, `action`
  // fell through to undefined and the button just vanished.
  completed: { label: "Đã hoàn thành", variant: "outline" },
};

export function ActiveTripCard({
  trip,
}: {
  trip: Trip & { estimated_fare?: number };
}) {
  const qc = useQueryClient();
  const theme = useTheme();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["driverContext"] });

  const onArrivalError = (err: unknown) => Alert.alert("Chưa thể xác nhận", arrivalErrorMessage(err));

  const { mutate: arrivedPickup, isPending: arriving } = useMutation({
    mutationFn: async () => {
      const { lat, lng } = await getCurrentCoords();
      return tripsService.arrivedPickup(trip.trip_id, lat, lng);
    },
    onSuccess: invalidate,
    onError: onArrivalError,
  });
  const { mutate: pickedUp, isPending: pickingUp } = useMutation({
    mutationFn: async () => {
      const { lat, lng } = await getCurrentCoords();
      return tripsService.pickedUp(trip.trip_id, lat, lng);
    },
    onSuccess: invalidate,
    onError: onArrivalError,
  });
  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: async () => {
      const { lat, lng } = await getCurrentCoords();
      return tripsService.complete(trip.trip_id, lat, lng);
    },
    onSuccess: () => {
      haptics.success();
      invalidate();
    },
    onError: onArrivalError,
  });
  const { mutate: cancelTrip, isPending: cancelling } = useMutation({
    mutationFn: () => tripsService.cancel(trip.trip_id),
    onSuccess: invalidate,
  });

  const confirmCancel = () => {
    confirmDestructive({
      title: "Huỷ chuyến này?",
      message: "Khách sẽ được thông báo. Thao tác này không thể hoàn tác.",
      cancelLabel: "Giữ chuyến",
      confirmLabel: "Huỷ chuyến",
      onConfirm: () => cancelTrip(),
    });
  };

  const avatarLetter =
    trip.customer_name?.trim().charAt(0).toUpperCase() || "K";

  const isCompleted = trip.status === "completed";
  const action = NEXT_ACTION[trip.status];
  const onAction =
    trip.status === "confirmed"
      ? arrivedPickup
      : trip.status === "arrived_pickup"
        ? pickedUp
        : complete;
  const actionPending = arriving || pickingUp || completing;
  // Mirrors the backend's CANCEL_RULES.cancelled_by_driver window (trips.ts).
  const canCancel = trip.status !== "picked_up" && !isCompleted;

  return (
    <Surface clip borderRadius={24} padding="$4" gap="$4">
      <XStack alignItems="center" gap="$3">
        <View
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor="$successContainer"
          alignItems="center"
          justifyContent="center"
        >
          <AppText variant="title" color="$onSuccessContainer">
            {avatarLetter}
          </AppText>
        </View>

        <YStack flex={1} gap="$1">
          <AppText variant="title" numberOfLines={1}>
            {trip.customer_name}
          </AppText>
          <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
            {trip.customer_phone}
          </AppText>
        </YStack>

        {trip.estimated_fare != null && (
          <AppText variant="bodyStrong">
            {formatCurrency(trip.estimated_fare)}
          </AppText>
        )}
      </XStack>

      <TripProgressStepper status={trip.status} />

      <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

      <TripMetaRow
        distanceKm={trip.distance_km}
        etaMinutes={trip.eta_minutes}
        pickupTime={trip.pickup_time}
        trafficNote={trip.traffic_note}
      />

      {(trip.has_bulky_goods || trip.with_children) && (
        <AppText variant="caption" color="$textSecondary">
          {[
            trip.has_bulky_goods ? "Hàng cồng kềnh" : null,
            trip.with_children ? "Có trẻ em" : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
      )}

      {action && (
        <Button
          label={action.label}
          variant={action.variant}
          onPress={onAction}
          loading={actionPending}
          disabled={isCompleted}
          full
        />
      )}
      {!isCompleted && (
        <XStack gap="$3">
          {trip.customer_phone ? (
            <Button
              label="Gọi khách"
              variant="outline"
              icon={<Ionicons name="call-outline" size={18} color={theme.textPrimary.val} />}
              onPress={() => Linking.openURL(`tel:${trip.customer_phone}`).catch(() => {})}
              full
            />
          ) : null}
          {canCancel && (
            <Button
              label="Huỷ chuyến"
              variant="outline"
              onPress={confirmCancel}
              loading={cancelling}
              disabled={actionPending}
              full
            />
          )}
        </XStack>
      )}
    </Surface>
  );
}
