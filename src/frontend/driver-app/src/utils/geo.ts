export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6371000

// Straight-line distance — only used client-side to detect "close enough to
// a step's end_location to advance" and to show a live-updating "distance
// to next turn" figure between navigation fetches; the actual route
// distances/ETAs always come from the backend's real road-distance call.
// Shortest distance from `point` to a polyline (sequence of LatLng), in
// metres. Equirectangular projection around the point — accurate to well
// under 1% at city scale, which is all the off-route check needs. Returns
// Infinity for an empty path so callers never treat "no route" as "on route".
export function distanceToPathMeters(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Infinity
  if (path.length === 1) return distanceMeters(point, path[0])
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const cosLat = Math.cos(toRad(point.lat))
  const project = (p: LatLng) => ({
    x: toRad(p.lng - point.lng) * cosLat * EARTH_RADIUS_M,
    y: toRad(p.lat - point.lat) * EARTH_RADIUS_M,
  })
  let best = Infinity
  let prev = project(path[0])
  for (let i = 1; i < path.length; i++) {
    const cur = project(path[i])
    const dx = cur.x - prev.x
    const dy = cur.y - prev.y
    const lenSq = dx * dx + dy * dy
    // Projection of the origin (the point) onto segment prev->cur, clamped.
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(prev.x * dx + prev.y * dy) / lenSq))
    const d = Math.hypot(prev.x + t * dx, prev.y + t * dy)
    if (d < best) best = d
    prev = cur
  }
  return best
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}
