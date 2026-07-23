import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator } from "react-native";
import { View, Text, useThemeName } from "tamagui";
import { BackButton } from "../../../src/components/BackButton";
import { TripStatusCard } from "../../../src/features/trips/components/TripStatusCard";
import { useTripStatus } from "../../../src/features/trips/hooks/useTripStatus";

export default function TripStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const themeName = useThemeName();
  const { data: trip, isLoading, isError } = useTripStatus(id ?? null);
  const isLight = themeName === "light";

  return (
    <View flex={1} backgroundColor={isLight ? "#F5F4F8" : "$surface"}>
      {/* `router.back()` doesn't work here either — see BackButton.tsx's
          comment: hidden tabs inside the same Tabs navigator have no real
          push/pop history to pop, so it fell back to Home. This screen is
          only ever reached from the Trips list, so that's the fixed
          destination — matches BackButton's own default for every other
          (Profile-only) screen. */}
      <BackButton onPress={() => router.replace("/trips")} />
      {isLoading ? (
        <View flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator size="large" color="#6c8aff" />
        </View>
      ) : isError || !trip ? (
        <View flex={1} alignItems="center" justifyContent="center" padding="$6">
          <Text color="$danger" fontSize="$4" fontWeight="500">
            Trip not found.
          </Text>
        </View>
      ) : (
        <TripStatusCard trip={trip} />
      )}
    </View>
  );
}
