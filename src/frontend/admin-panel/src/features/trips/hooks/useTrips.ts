import { useQuery } from "@tanstack/react-query";
import { tripsService } from "../../../services/api";

export function useTrips(statusFilter?: string) {
  return useQuery({
    queryKey: ['trips', statusFilter],
    queryFn: () => tripsService.list(statusFilter),
    // The board must stay live for dispatchers; 5 s is cheap (one cached list call).
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })
}