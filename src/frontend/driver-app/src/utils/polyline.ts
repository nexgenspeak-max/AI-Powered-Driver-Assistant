import type { LatLng } from './geo'

// Standard Google/Goong encoded-polyline decoder (precision 5 — same
// encoding both providers' Direction APIs use) — ported from
// trip-service/src/utils/polyline.ts's server-side decoder. Needed here
// because the navigation HUD's leg (GET /drivers/me/navigation) sends the
// encoded string straight through, unlike the multi-stop optimized route's
// `path`, which trip-service already decodes before sending it to the app.
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = 10 ** precision
  const coordinates: LatLng[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    coordinates.push({ lat: lat / factor, lng: lng / factor })
  }

  return coordinates
}
