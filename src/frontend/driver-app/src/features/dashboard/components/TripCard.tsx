import { XStack, YStack, View } from "tamagui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Surface } from "../../../components/Surface";
import { AppText } from "../../../components/AppText";
import { RouteLine } from "../../../components/RouteLine";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { TripMetaRow } from "./TripMetaRow";
import { tripsService } from "../../../services/api/trips";
import { pushImmediateLocation } from "../../../services/location/pushImmediateLocation";
import { confirmDestructive } from "../../../utils/confirmDialog";
import {
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
} from "../../../constants/status";
import { formatCurrency } from "../../../utils/format";
import { haptics } from "../../../utils/haptics";
import type { Trip } from "../../../types";

export function TripCard({
  trip,
}: {
  trip: Trip & { estimated_fare?: number };
}) {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["driverContext"] });

  const { mutate: accept, isPending: accepting } = useMutation({
    mutationFn: () => {
      // Fired in parallel, not awaited — see pushImmediateLocation.ts.
      pushImmediateLocation();
      return tripsService.accept(trip.trip_id);
    },
    onSuccess: () => {
      haptics.success();
      invalidate();
    },
  });
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(trip.trip_id),
    onSuccess: invalidate,
  });

  const confirmReject = () => {
    confirmDestructive({
      title: "Từ chối chuyến này?",
      message: "Bạn sẽ không thể nhận lại chuyến này sau khi từ chối.",
      cancelLabel: "Giữ lại",
      confirmLabel: "Từ chối",
      onConfirm: () => reject(),
    });
  };

  const statusColor = TRIP_STATUS_COLORS[trip.status];
  const avatarLetter =
    trip.customer_name?.trim().charAt(0).toUpperCase() || "K";
  const showActions = trip.status === "notified" || trip.status === "calling";

  return (
    <Surface clip borderRadius={24} padding="$4" gap="$4">
      <XStack alignItems="center" gap="$3">
        <View
          width={44}
          height={44}
          borderRadius={22}
          backgroundColor={statusColor.bg}
          alignItems="center"
          justifyContent="center"
        >
          <AppText variant="title" color={statusColor.text}>
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

        <YStack alignItems="flex-end" gap="$1">
          <Badge
            label={TRIP_STATUS_LABELS[trip.status]}
            backgroundColor={statusColor.bg}
            color={statusColor.text}
            glass={false}
          />
          {trip.estimated_fare != null && (
            <AppText variant="bodyStrong">
              {formatCurrency(trip.estimated_fare)}
            </AppText>
          )}
        </YStack>
      </XStack>

      <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

      <TripMetaRow
        distanceKm={trip.distance_km}
        etaMinutes={trip.eta_minutes}
        pickupTime={trip.pickup_time}
        trafficNote={trip.traffic_note}
      />

      {showActions && (
        <XStack gap="$3">
          <Button
            label="Từ chối"
            variant="outline"
            onPress={confirmReject}
            loading={rejecting}
            full
          />
          <Button
            label="Nhận chuyến"
            variant="primary"
            onPress={() => accept()}
            loading={accepting}
            full
          />
        </XStack>
      )}
    </Surface>
  );
}
