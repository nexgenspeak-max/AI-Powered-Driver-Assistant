export type LngLat = [number, number]
export type LngLatBounds = [number, number, number, number]

export const GOONG_MAPS_KEY = process.env.EXPO_PUBLIC_GOONG_MAPS_KEY ?? ''
export const GOONG_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPS_KEY}`

export const DEFAULT_CENTER: LngLat = [105.8342, 21.0278]
export const DEFAULT_ZOOM = 12
export const DRIVER_INITIAL_ZOOM = 15
export const SINGLE_POINT_ZOOM = 14
export const FIT_PADDING = { top: 100, right: 60, bottom: 60, left: 60 }
export const NAV_ZOOM = 17.5
export const NAV_PITCH = 45
export const NAV_LINE_COLOR = '#2563eb'
export const DRIVER_COLOR = '#8B5CF6'
export const TRIP_COLORS = ['#2563eb', '#16a34a', '#f97316', '#db2777', '#0891b2', '#a16207', '#dc2626', '#4f46e5']

export function colorForTrip(index: number): string {
  return TRIP_COLORS[index % TRIP_COLORS.length]
}

export function boundsFromPoints(points: LngLat[]): LngLatBounds | null {
  if (points.length === 0) return null
  let west = points[0][0]
  let east = points[0][0]
  let south = points[0][1]
  let north = points[0][1]
  for (const [lng, lat] of points) {
    if (lng < west) west = lng
    if (lng > east) east = lng
    if (lat < south) south = lat
    if (lat > north) north = lat
  }
  return [west, south, east, north]
}
