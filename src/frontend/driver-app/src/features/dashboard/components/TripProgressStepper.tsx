import { XStack, YStack, View, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../../components/AppText";
import type { TripStatus } from "../../../types";

const STEPS: { status: TripStatus; label: string }[] = [
  { status: "confirmed", label: "Đã nhận" },
  { status: "arrived_pickup", label: "Đã đến" },
  { status: "picked_up", label: "Đã đón" },
];

const DOT = 18;

// Three equal columns (dot + label centred in each) with the connector
// lines drawn underneath between column centres — the previous
// flex/fixed-width mix let the last label run past the card edge.
export function TripProgressStepper({ status }: { status: TripStatus }) {
  const theme = useTheme();
  const currentIndex = STEPS.findIndex((s) => s.status === status);
  const colPct = 100 / STEPS.length;

  return (
    <View width="100%" position="relative">
      {STEPS.slice(0, -1).map((_, i) => {
        const done = i < currentIndex;
        return (
          <View
            key={`line-${i}`}
            position="absolute"
            top={DOT / 2 - 1}
            height={2}
            left={`${colPct * (i + 0.5)}%`}
            width={`${colPct}%`}
            backgroundColor={done ? "$success" : "$border"}
          />
        );
      })}
      <XStack width="100%">
        {STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <YStack key={step.status} flex={1} alignItems="center" gap="$1">
              <View
                width={DOT}
                height={DOT}
                borderRadius={DOT / 2}
                alignItems="center"
                justifyContent="center"
                backgroundColor={isDone ? theme.success.val : theme.surfaceElevated.val}
                borderWidth={isCurrent ? 2 : isDone ? 0 : 1.5}
                borderColor={isCurrent ? theme.success.val : theme.borderStrong.val}
              >
                {isDone && <Ionicons name="checkmark" size={11} color={theme.textInverse.val} />}
                {isCurrent && <View width={6} height={6} borderRadius={3} backgroundColor={theme.success.val} />}
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
          );
        })}
      </XStack>
    </View>
  );
}
