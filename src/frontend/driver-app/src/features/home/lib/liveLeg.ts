import { distanceMeters, type LatLng } from '../../../utils/geo'

// The next-stop card showed the optimized route's leg figures, which are
// only recomputed when the route is rebuilt — a driver 400 m from the
// pickup still read "15 phút · 4,0 km" (simulator 2026-10-18). This keeps
// the server's road distance as the truth for the route's shape and scales
// it by how much of the straight line is left from the live GPS fix:
//   detour = serverRoad / straight(routeOrigin → stop), clamped to [1, 2]
//   remaining ≈ straight(live → stop) × detour, ETA scaled the same way.

export const MIN_DETOUR = 1
export const MAX_DETOUR = 2

export function liveLeg(args: {
  serverDistanceM: number | null
  serverEtaMin: number | null
  routeOrigin: LatLng | null
  live: LatLng | null
  stop: LatLng
}): { distanceKm: number | null; etaMinutes: number | null } {
  const { serverDistanceM, serverEtaMin, routeOrigin, live, stop } = args
  const fallback = {
    distanceKm: serverDistanceM && serverDistanceM > 0 ? serverDistanceM / 1000 : null,
    etaMinutes: serverEtaMin && serverEtaMin > 0 ? serverEtaMin : null,
  }
  if (!live) return fallback
  const straightNow = distanceMeters(live, stop)
  let detour = 1.3 // typical urban road/straight ratio when the origin is unknown
  if (serverDistanceM && serverDistanceM > 0 && routeOrigin) {
    const straightThen = distanceMeters(routeOrigin, stop)
    if (straightThen > 50) detour = serverDistanceM / straightThen
  }
  detour = Math.min(MAX_DETOUR, Math.max(MIN_DETOUR, detour))
  const remainingM = straightNow * detour
  let eta = fallback.etaMinutes
  if (eta != null && serverDistanceM && serverDistanceM > 0) {
    eta = Math.max(1, Math.round(eta * Math.min(1.5, remainingM / serverDistanceM)))
  }
  return { distanceKm: remainingM / 1000, etaMinutes: eta }
}
