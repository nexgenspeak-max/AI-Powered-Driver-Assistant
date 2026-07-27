import { Alert } from "react-native";
import { XStack, YStack, View, Text } from "tamagui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassSurface } from "../../../components/GlassSurface";
import { Button } from "../../../components/Button";
import { InfoRow } from "./InfoRow";
import { TripProgressStepper } from "./TripProgressStepper";
import { tripsService } from "../../../services/api/trips";
import { formatCurrency, formatDate } from "../../../utils/format";
import type { Trip } from "../../../types";

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

  const { mutate: arrivedPickup, isPending: arriving } = useMutation({
    mutationFn: () => tripsService.arrivedPickup(trip.trip_id),
    onSuccess: invalidate,
  });
  const { mutate: pickedUp, isPending: pickingUp } = useMutation({
    mutationFn: () => tripsService.pickedUp(trip.trip_id),
    onSuccess: invalidate,
  });
  const { mutate: complete, isPending: completing } = useMutation({
    mutationFn: () => tripsService.complete(trip.trip_id),
    onSuccess: invalidate,
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
        <Button
          label="Cancel Trip"
          variant="outline"
          onPress={confirmCancel}
          loading={cancelling}
          disabled={actionPending}
          full
        />
      </YStack>
    </GlassSurface>
  );
}
