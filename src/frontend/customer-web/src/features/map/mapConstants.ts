export const GOONG_MAPS_KEY = import.meta.env.VITE_GOONG_MAPS_KEY ?? ''
export const GOONG_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPS_KEY}`
export const DEFAULT_CENTER: [number, number] = [105.8342, 21.0278]
export const DEFAULT_ZOOM = 12
export const DRIVER_COLOR = '#8B5CF6'
export const TRIP_COLORS = ['#2563eb', '#16a34a', '#f97316', '#db2777', '#0891b2', '#a16207', '#dc2626', '#4f46e5']

export function colorForTrip(index: number): string {
  return TRIP_COLORS[index % TRIP_COLORS.length]
}
