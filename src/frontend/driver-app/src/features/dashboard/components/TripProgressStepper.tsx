import { XStack, YStack, View, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../../components/AppText";
import type { TripStatus } from "../../../types";

const STEPS: { status: TripStatus; label: string }[] = [
  { status: "confirmed", label: "Đã nhận" },
  { status: "arrived_pickup", label: "Đã đến" },
  { status: "picked_up", label: "Đã đón" },
];

export function TripProgressStepper({ status }: { status: TripStatus }) {
  const theme = useTheme();
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <XStack alignItems="flex-start" width="100%">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        // The segment after this step only fills once the *next* step is
        // reached (this step is done, not merely current).
        const lineColor = isDone ? theme.success.val : theme.border.val;

        return (
          <XStack
            key={step.status}
            flex={i === STEPS.length - 1 ? 0 : 1}
            alignItems="flex-start"
          >
            <YStack alignItems="center" gap="$1" width={64} flexShrink={0}>
              <View
                width={18}
                height={18}
                borderRadius={9}
                alignItems="center"
                justifyContent="center"
                backgroundColor={isDone ? theme.success.val : "transparent"}
                borderWidth={isCurrent ? 2 : isDone ? 0 : 1.5}
                borderColor={isCurrent ? theme.success.val : theme.borderStrong.val}
              >
                {isDone && (
                  <Ionicons name="checkmark" size={11} color={theme.textInverse.val} />
                )}
                {isCurrent && (
                  <View width={6} height={6} borderRadius={3} backgroundColor={theme.success.val} />
                )}
              </View>
              <AppText
                variant="caption"
                color={isCurrent ? "$textPrimary" : "$textSecondary"}
                textAlign="center"
                numberOfLines={1}
              >
                {step.label}
              </AppText>
            </YStack>
            {i < STEPS.length - 1 && (
              <View flex={1} height={2} marginTop={8} backgroundColor={lineColor} />
            )}
          </XStack>
        );
      })}
    </XStack>
  );
}
