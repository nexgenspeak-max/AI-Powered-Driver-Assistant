import Foundation

struct LatLng: Codable, Hashable, Sendable {
    var lat: Double
    var lng: Double
}

/// Geometry helpers ported from `src/utils/geo.ts` and `src/utils/polyline.ts`.
enum Geo {
    static let earthRadiusM = 6_371_000.0

    static func distanceMeters(_ a: LatLng, _ b: LatLng) -> Double {
        let toRad = { (d: Double) in d * .pi / 180 }
        let dLat = toRad(b.lat - a.lat)
        let dLng = toRad(b.lng - a.lng)
        let h = pow(sin(dLat / 2), 2) + cos(toRad(a.lat)) * cos(toRad(b.lat)) * pow(sin(dLng / 2), 2)
        return 2 * earthRadiusM * asin(min(1, sqrt(h)))
    }

    /// Shortest distance from `point` to a polyline, in metres. Infinity for an empty path.
    static func distanceToPath(_ point: LatLng, _ path: [LatLng]) -> Double {
        guard let first = path.first else { return .infinity }
        if path.count == 1 { return distanceMeters(point, first) }
        let toRad = { (d: Double) in d * .pi / 180 }
        let cosLat = cos(toRad(point.lat))
        func project(_ p: LatLng) -> (x: Double, y: Double) {
            (toRad(p.lng - point.lng) * cosLat * earthRadiusM, toRad(p.lat - point.lat) * earthRadiusM)
        }
        var best = Double.infinity
        var prev = project(first)
        for p in path.dropFirst() {
            let cur = project(p)
            let dx = cur.x - prev.x, dy = cur.y - prev.y
            let lenSq = dx * dx + dy * dy
            let t = lenSq == 0 ? 0 : max(0, min(1, -(prev.x * dx + prev.y * dy) / lenSq))
            best = min(best, hypot(prev.x + t * dx, prev.y + t * dy))
            prev = cur
        }
        return best
    }

    /// Google/Goong encoded polyline decoder (precision 5).
    static func decodePolyline(_ encoded: String, precision: Int = 5) -> [LatLng] {
        let factor = pow(10.0, Double(precision))
        let bytes = Array(encoded.utf8)
        var index = 0, lat = 0, lng = 0
        var coords: [LatLng] = []
        func next() -> Int? {
            var shift = 0, result = 0
            while index < bytes.count {
                let byte = Int(bytes[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20 { return (result & 1) != 0 ? ~(result >> 1) : (result >> 1) }
            }
            return nil
        }
        while index < bytes.count {
            guard let dLat = next(), let dLng = next() else { break }
            lat += dLat
            lng += dLng
            coords.append(LatLng(lat: Double(lat) / factor, lng: Double(lng) / factor))
        }
        return coords
    }

    /// Encodes coordinates as a precision-5 polyline (used by demo data and tests).
    static func encodePolyline(_ points: [LatLng], precision: Int = 5) -> String {
        let factor = pow(10.0, Double(precision))
        var out = ""
        var prevLat = 0, prevLng = 0
        func encode(_ value: Int) {
            var v = value < 0 ? ~(value << 1) : (value << 1)
            while v >= 0x20 {
                out.unicodeScalars.append(UnicodeScalar(UInt8((0x20 | (v & 0x1F)) + 63)))
                v >>= 5
            }
            out.unicodeScalars.append(UnicodeScalar(UInt8(v + 63)))
        }
        for p in points {
            let lat = Int((p.lat * factor).rounded()), lng = Int((p.lng * factor).rounded())
            encode(lat - prevLat)
            encode(lng - prevLng)
            prevLat = lat
            prevLng = lng
        }
        return out
    }
}
