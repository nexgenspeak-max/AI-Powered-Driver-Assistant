import { useState } from "react";
import { Linking, TouchableOpacity } from "react-native";
import { XStack, YStack } from "tamagui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Surface } from "../../../components/Surface";
import { AppText } from "../../../components/AppText";
import { RouteLine } from "../../../components/RouteLine";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Ionicons } from "@expo/vector-icons";
import { tripsService } from "../../../services/api/trips";
import { confirmDestructive } from "../../../utils/confirmDialog";
import { DriverPicker } from "../../booking/components/DriverPicker";
import {
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
} from "../../../constants/status";
import type { Trip, TripStatus, Driver } from "../../../types";

// Mirrors the backend's CANCEL_RULES.cancelled window (trips.ts) — a customer
// can cancel any time from booking through the driver arriving at pickup, right
// up until they're in the vehicle (`picked_up`), including rejected/no_answer.
// The server enforces this independently; this just avoids showing a button
// that would 409.
const CUSTOMER_CANCELLABLE_STATUSES: TripStatus[] = [
  "pending",
  "notified",
  "calling",
  "confirmed",
  "arrived_pickup",
  "rejected",
  "no_answer",
];

export function TripStatusCard({ trip }: { trip: Trip }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status];
  const qc = useQueryClient();
  const { mutate: cancelTrip, isPending: cancelling } = useMutation({
    mutationFn: () => tripsService.cancel(trip.trip_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", trip.trip_id] }),
  });
  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.includes(trip.status);

  const [reassignTo, setReassignTo] = useState<Driver | null>(null);
  const { mutate: reassignDriver, isPending: reassigning } = useMutation({
    mutationFn: () => tripsService.reassignDriver(trip.trip_id, reassignTo!.phone),
    onSuccess: () => {
      setReassignTo(null);
      qc.invalidateQueries({ queryKey: ["trip", trip.trip_id] });
    },
  });
  const isRejected = trip.status === "rejected";

  const confirmCancel = () => {
    confirmDestructive({
      title: "Huỷ chuyến này?",
      message: "Không thể hoàn tác — bạn sẽ cần đặt chuyến mới.",
      cancelLabel: "Giữ chuyến",
      confirmLabel: "Huỷ chuyến",
      onConfirm: () => cancelTrip(),
    });
  };

  return (
    <YStack gap="$4">
      <Surface padding="$4" gap="$3">
        <YStack gap={4}>
          <Badge
            label={TRIP_STATUS_LABELS[trip.status]}
            backgroundColor={statusColor.bg}
            color={statusColor.text}
            glass={false}
          />
          <AppText variant="caption" color="$textMuted">
            #{trip.trip_id}
          </AppText>
        </YStack>

        <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />

        <XStack alignItems="center" justifyContent="space-between">
          <YStack gap={2}>
            <AppText variant="caption" color="$textMuted">
              Tài xế
            </AppText>
            <AppText variant="bodyStrong">{trip.driver_phone}</AppText>
          </YStack>
          {/* Just the call action here — a live map/ETA is a larger feature
              left for a separate task. */}
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${trip.driver_phone}`)}
            accessibilityRole="button"
            accessibilityLabel="Gọi tài xế"
            style={{ padding: 10 }}
          >
            <Ionicons name="call" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </XStack>
      </Surface>

      {isRejected && (
        <Surface padding="$4" gap="$4">
          <AppText variant="body">
            Tài xế đã từ chối chuyến này. Chọn tài xế khác để đặt lại.
          </AppText>
          <DriverPicker selected={reassignTo} onSelect={setReassignTo} />
          <Button
            label="Đặt lại chuyến"
            variant="primary"
            onPress={() => reassignDriver()}
            loading={reassigning}
            disabled={!reassignTo}
          />
        </Surface>
      )}

      {canCancel && (
        <Button
          label="Huỷ chuyến"
          variant="danger"
          onPress={confirmCancel}
          loading={cancelling}
        />
      )}
    </YStack>
  );
}
