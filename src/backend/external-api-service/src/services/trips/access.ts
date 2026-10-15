import { normalizePhone } from '../telephony';

/**
 * Who may read or act on a trip. Admin and service callers (voice agent, other
 * services; their service JWT carries role=admin) act on behalf of whoever is on
 * the call and are trusted. A driver or customer session may only touch its own
 * trip. Missing user = routes mounted without authenticate (local tools).
 */
export function isTripOwner(
  user: { role?: string; phone?: string; sub?: string } | undefined,
  trip: { driver_phone?: string; customer_phone?: string; id_account?: string },
): boolean {
  if (!user || user.role === 'admin' || user.role === 'super_admin') return true;
  if (user.role === 'driver') {
    return !!user.phone && !!trip.driver_phone && normalizePhone(user.phone) === normalizePhone(trip.driver_phone);
  }
  if (user.role === 'customer') {
    if (trip.id_account) return trip.id_account === user.sub;
    return !!user.phone && !!trip.customer_phone && normalizePhone(user.phone) === normalizePhone(trip.customer_phone);
  }
  return false;
}
