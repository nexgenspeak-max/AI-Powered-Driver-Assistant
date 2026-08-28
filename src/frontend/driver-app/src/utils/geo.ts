export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6371000

// Straight-line distance — only used client-side to detect "close enough to
// a step's end_location to advance" and to show a live-updating "distance
// to next turn" figure between navigation fetches; the actual route
// distances/ETAs always come from the backend's real road-distance call.
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}
