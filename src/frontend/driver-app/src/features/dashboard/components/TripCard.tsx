import { XStack, YStack, View, Text, useThemeName } from "tamagui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassSurface } from "../../../components/GlassSurface";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { InfoRow } from "./InfoRow";
import { tripsService } from "../../../services/api/trips";
import {
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
} from "../../../constants/status";
import { formatCurrency, formatDate } from "../../../utils/format";
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
    mutationFn: () => tripsService.accept(trip.trip_id),
    onSuccess: invalidate,
  });
  const { mutate: reject, isPending: rejecting } = useMutation({
    mutationFn: () => tripsService.reject(trip.trip_id),
    onSuccess: invalidate,
  });

  const isLight = useThemeName() === "light";
  const statusColor = TRIP_STATUS_COLORS[trip.status];
  const avatarLetter =
    trip.customer_name?.trim().charAt(0).toUpperCase() || "D";

  return (
    <GlassSurface style={{ width: "100%" }}>
      <YStack padding="$4" gap="$3">
        <XStack alignItems="center" gap="$3">
          <View
            width={48}
            height={48}
            borderRadius={24}
            backgroundColor={statusColor.bg}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontWeight="700" fontSize="$4" color={statusColor.text}>
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

          <YStack alignItems="flex-end" gap="$1">
            <Badge
              label={TRIP_STATUS_LABELS[trip.status]}
              backgroundColor={statusColor.bg}
              color={statusColor.text}
              glass={false}
            />
            {trip.estimated_fare != null && (
              <Text color="$textSecondary" fontSize={11}>
                {formatCurrency(trip.estimated_fare)}
              </Text>
            )}
          </YStack>
        </XStack>

        <YStack gap="$2">
          <InfoRow label="Ngày giờ đón" value={trip.pickup_time ? formatDate(trip.pickup_time) : "—"} />
          <InfoRow label="SĐT khách" value={trip.customer_phone} />
          <InfoRow label="Pickup" value={trip.pickup_address} />
          <InfoRow label="Dropoff" value={trip.dropoff_address} />
        </YStack>

        {(trip.status === "notified" || trip.status === "calling") && (
          <XStack gap="$3">
            <Button
              label="Reject"
              variant="outline"
              onPress={() => reject()}
              loading={rejecting}
              full
            />
            <Button
              label="Accept"
              variant="primary"
              onPress={() => accept()}
              loading={accepting}
              full
            />
          </XStack>
        )}
      </YStack>
    </GlassSurface>
  );
}
