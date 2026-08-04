import { Alert } from "react-native";
import * as Location from "expo-location";
import { XStack, YStack, View, Text } from "tamagui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassSurface } from "../../../components/GlassSurface";
import { Button } from "../../../components/Button";
import { InfoRow } from "./InfoRow";
import { TripProgressStepper } from "./TripProgressStepper";
import { tripsService } from "../../../services/api/trips";
import { formatCurrency, formatDate } from "../../../utils/format";
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

// Foreground permission should already be granted by the time these are
// pressed (useProximityTracking requests it as soon as the trip becomes
// `confirmed`), but ask again here too — cheap no-op if already granted, and
// this is the only thing standing between the driver and a stuck button if
// that earlier request was ever missed or revoked.
async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Cần quyền vị trí để xác nhận trạng thái này");
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

const NEXT_ACTION: Record<
  string,
  { label: string; variant: "outline" | "success" }
> = {
  confirmed: { label: "Arrived at Pickup", variant: "outline" },
  arrived_pickup: { label: "Picked Up Customer", variant: "outline" },
  picked_up: { label: "Complete Trip", variant: "success" },
};

export function ActiveTripCard({
  trip,
}: {
  trip: Trip & { estimated_fare?: number };
}) {
  const qc = useQueryClient();
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
    onSuccess: invalidate,
    onError: onArrivalError,
  });
  const { mutate: cancelTrip, isPending: cancelling } = useMutation({
    mutationFn: () => tripsService.cancel(trip.trip_id),
    onSuccess: invalidate,
  });

  const confirmCancel = () => {
    Alert.alert(
      "Cancel this trip?",
      "The customer will be notified. This can't be undone.",
      [
        { text: "Keep trip", style: "cancel" },
        { text: "Cancel trip", style: "destructive", onPress: () => cancelTrip() },
      ],
    );
  };

  const avatarLetter =
    trip.customer_name?.trim().charAt(0).toUpperCase() || "D";

  const action = NEXT_ACTION[trip.status];
  const onAction =
    trip.status === "confirmed"
      ? arrivedPickup
      : trip.status === "arrived_pickup"
        ? pickedUp
        : complete;
  const actionPending = arriving || pickingUp || completing;
  // Mirrors the backend's CANCEL_RULES.cancelled_by_driver window (trips.ts)
  // — once the customer is actually in the vehicle, cancelling isn't a valid
  // move anymore (only "Complete Trip" is); the server enforces this
  // independently, this just avoids showing a button that would 409.
  const canCancel = trip.status !== "picked_up";

  return (
    <GlassSurface style={{ width: "100%" }}>
      <YStack padding="$4" gap="$4">
        <XStack alignItems="center" gap="$3">
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor="$successContainer"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontWeight="700" fontSize="$4" color="$onSuccessContainer">
              {avatarLetter}
            </Text>
          </View>

          <YStack flex={1} gap="$1">
            <Text
              fontWeight="700"
              color="$textPrimary"
              fontSize="$4"
              numberOfLines={1}
            >
              {trip.customer_name}
            </Text>
            {!!trip.pickup_time && (
              <Text color="$textSecondary" fontSize={12} numberOfLines={1}>
                {formatDate(trip.pickup_time)}
              </Text>
            )}
          </YStack>

          {trip.estimated_fare != null && (
            <Text color="$textPrimary" fontWeight="700" fontSize="$3">
              {formatCurrency(trip.estimated_fare)}
            </Text>
          )}
        </XStack>

        <TripProgressStepper status={trip.status} />

        <YStack gap="$2">
          <InfoRow label="Ngày giờ đón" value={trip.pickup_time ? formatDate(trip.pickup_time) : "—"} />
          <InfoRow label="SĐT khách" value={trip.customer_phone} />
          <InfoRow label="Pickup" value={trip.pickup_address} />
          <InfoRow label="Dropoff" value={trip.dropoff_address} />
        </YStack>

        {action && (
          <Button
            label={action.label}
            variant={action.variant}
            onPress={onAction}
            loading={actionPending}
            full
          />
        )}
        {canCancel && (
          <Button
            label="Cancel Trip"
            variant="outline"
            onPress={confirmCancel}
            loading={cancelling}
            disabled={actionPending}
            full
          />
        )}
      </YStack>
    </GlassSurface>
  );
}
