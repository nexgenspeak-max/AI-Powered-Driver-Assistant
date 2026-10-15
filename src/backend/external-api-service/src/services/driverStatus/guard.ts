/**
 * Going offline while a trip is still in progress would strand the customer:
 * the driver stops receiving nudges and dispatch treats them as unavailable.
 * Accepted-but-unfinished statuses mirror IN_PROGRESS_STATUSES in routes/drivers.ts.
 */
export const ACTIVE_TRIP_STATUSES = new Set(['confirmed', 'arrived_pickup', 'picked_up']);

export interface TripLike {
  trip_id?: string;
  status?: string;
}

/** Trip ids that block going offline; empty when the change is allowed. */
export function offlineBlockedBy(online: boolean, trips: TripLike[]): string[] {
  if (online) return [];
  return trips.filter(t => t.trip_id && ACTIVE_TRIP_STATUSES.has(t.status ?? '')).map(t => t.trip_id as string);
}
