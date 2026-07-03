import { useQuery } from "@tanstack/react-query";
import { tripsService } from "../../../services/api";

export function useTrips(statusFilter?: string) {
  return useQuery({
    queryKey: ['trips', statusFilter],
    queryFn: () => tripsService.list(statusFilter),
    // refetchInterval: 3000,   // live polling
  })
}