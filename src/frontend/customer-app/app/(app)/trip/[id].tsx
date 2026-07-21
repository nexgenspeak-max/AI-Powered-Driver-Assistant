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
      <BackButton onPress={router.back} />
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
