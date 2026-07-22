import { XStack, YStack, View, Text, useTheme } from "tamagui";
import type { TripStatus } from "../../../types";

const STEPS: { status: TripStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "arrived_pickup", label: "Arrived" },
  { status: "picked_up", label: "Picked Up" },
];

export function TripProgressStepper({ status }: { status: TripStatus }) {
  const theme = useTheme();
  const currentIndex = STEPS.findIndex((s) => s.status === status);

  return (
    <XStack alignItems="flex-start">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        // Line segment after this step is only "filled" once the *next*
        // step has been reached (i.e. this step is done, not just current) —
        // otherwise the current step's own line reads as already progressed
        // past it.
        const lineColor = isDone ? theme.success.val : theme.border.val;

        return (
          <XStack key={step.status} flex={i === STEPS.length - 1 ? 0 : 1} alignItems="flex-start">
            <YStack alignItems="center" gap="$1" width={64}>
              <View
                width={22}
                height={22}
                borderRadius={11}
                alignItems="center"
                justifyContent="center"
                backgroundColor={isDone ? theme.success.val : "transparent"}
                borderWidth={isCurrent ? 2 : isDone ? 0 : 1.5}
                borderColor={isCurrent ? theme.success.val : theme.borderStrong.val}
              >
                {isDone && (
                  <Text fontSize={12} fontWeight="700" color={theme.textInverse.val}>
                    ✓
                  </Text>
                )}
                {isCurrent && (
                  <View width={8} height={8} borderRadius={4} backgroundColor={theme.success.val} />
                )}
              </View>
              <Text
                fontSize={10}
                fontWeight={isCurrent ? "700" : "500"}
                color={isCurrent ? "$textPrimary" : "$textSecondary"}
                textAlign="center"
              >
                {step.label}
              </Text>
            </YStack>
            {i < STEPS.length - 1 && (
              <View flex={1} height={2} marginTop={10} backgroundColor={lineColor} />
            )}
          </XStack>
        );
      })}
    </XStack>
  );
}
