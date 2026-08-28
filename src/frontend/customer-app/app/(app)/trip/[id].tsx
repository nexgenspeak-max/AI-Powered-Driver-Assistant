import { useLocalSearchParams, router } from "expo-router";
import { Screen } from "../../../src/components/Screen";
import { AppBar } from "../../../src/components/AppBar";
import { AppText } from "../../../src/components/AppText";
import { Skeleton } from "../../../src/components/Skeleton";
import { TripStatusCard } from "../../../src/features/trips/components/TripStatusCard";
import { useTripStatus } from "../../../src/features/trips/hooks/useTripStatus";

export default function TripStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: trip, isLoading, isError } = useTripStatus(id ?? null);

  return (
    <Screen
      scroll
      header={
        <AppBar
          title="Trạng thái chuyến"
          onBack={() => router.replace("/trips")}
        />
      }
    >
      {isLoading ? (
        <>
          <Skeleton width={140} height={26} />
          <Skeleton height={200} radius={24} />
        </>
      ) : isError || !trip ? (
        <AppText variant="title" color="$danger">
          Không tìm thấy chuyến đi.
        </AppText>
      ) : (
        <TripStatusCard trip={trip} />
      )}
    </Screen>
  );
}
