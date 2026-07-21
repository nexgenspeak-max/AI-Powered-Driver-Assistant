import { YStack, Text, View, useThemeName } from "tamagui";
import { TripCard } from "./TripCard";
import type { Trip } from "../../../types";

interface Props {
  title: string;
  trips: (Trip & { estimated_fare?: number })[];
}

export function TripSection({ title, trips }: Props) {
  const isLight = useThemeName() === "light";
  if (trips.length === 0) return null;

  const sectionBackground = isLight ? "#F2F1F8" : "rgba(255,255,255,0.04)";
  const headerBackground = isLight ? "#ECEAF3" : "rgba(255,255,255,0.06)";

  return (
    <YStack
      borderRadius={18}
      overflow="hidden"
      backgroundColor={sectionBackground}
    >
      <View backgroundColor={headerBackground} padding="$3">
        <Text
          fontSize="$1"
          fontWeight="600"
          color="$textSecondary"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          {title}
        </Text>
      </View>
      {/* gap="$7" (28px), not "$3" (12px) — GlassSurface's outer drop
          shadow reaches roughly offset+radius past the card's own edge
          (~24px dark, ~30px light; see GlassSurface.tsx's
          getSurfaceOuterShadow). At 12px the previous card's shadow bled
          into the next card's top-right corner — exactly where the status
          Badge sits — reading as a stray glass patch floating behind the
          badge instead of a normal shadow gap between list items. */}
      <YStack padding="$3" gap="$7">
        {trips.map((trip) => (
          <TripCard key={trip.trip_id} trip={trip} />
        ))}
      </YStack>
    </YStack>
  );
}
