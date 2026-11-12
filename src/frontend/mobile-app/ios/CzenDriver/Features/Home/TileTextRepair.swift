import Foundation
import MapLibre

/// Goong's `composite` vector tiles carry some POI names (layer `point_map`, property `name`)
/// that were double-encoded upstream: the UTF-8 bytes were read as Windows-1252 and the result
/// title-cased, e.g. "Công Ty Cổ Phần" arrives as "Cã´ng Ty Cá»• Pháº§n". MapLibre renders the
/// string it is given, so the fix is to undo that encoding before the tile reaches the renderer.
enum MojibakeRepair {
    /// Windows-1252 0x80–0x9F code points that are not Latin-1 controls.
    private static let cp1252: [UInt32: UInt8] = [
        0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
        0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
        0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
        0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
    ]

    private static func isContinuation(_ b: UInt8) -> Bool { b & 0xC0 == 0x80 }

    /// The repaired text, or nil when `text` is not this kind of mojibake (left untouched).
    /// Correct text never qualifies: real Vietnamese contains letters outside Windows-1252
    /// (ộ, ư…), and Latin-1-only text such as "Bãi" or "Café" is not a valid byte sequence.
    static func repair(_ text: String) -> String? {
        var bytes: [UInt8] = []
        bytes.reserveCapacity(text.utf8.count)
        var sawHigh = false
        for scalar in text.unicodeScalars {
            let v = scalar.value
            if v < 0x100 {
                bytes.append(UInt8(v))
                if v >= 0x80 { sawHigh = true }
            } else if let b = cp1252[v] {
                bytes.append(b)
                sawHigh = true
            } else {
                return nil
            }
        }
        guard sawHigh, let decoded = decodeLenient(bytes) else { return nil }
        guard decoded != text,
              decoded.unicodeScalars.contains(where: { $0.value >= 0x80 }),
              !decoded.unicodeScalars.contains(where: { (0x80...0x9F).contains($0.value) || ($0.value < 0x20 && $0 != "\n") })
        else { return nil }
        // The upstream pass title-cased the mojibake (which also changed case inside letters);
        // title-casing the decoded name restores a consistent "Công Ty Cổ Phần".
        return decoded.capitalized(with: Locale(identifier: "vi_VN"))
    }

    /// UTF-8 decode that also accepts lead bytes whose case the title-casing flipped:
    /// a lowercased 2-byte lead (Ã→ã: C3→E3) and an uppercased 3-byte lead (á→Á: E1→C1).
    /// Both shapes are never valid UTF-8, so reading them this way cannot change correct text.
    private static func decodeLenient(_ b: [UInt8]) -> String? {
        var out: [UInt8] = []
        out.reserveCapacity(b.count)
        var i = 0
        let n = b.count
        func conts(_ from: Int, _ count: Int) -> Bool {
            guard from + count <= n else { return false }
            return (from..<(from + count)).allSatisfy { isContinuation(b[$0]) }
        }
        while i < n {
            let c = b[i]
            if c < 0x80 { out.append(c); i += 1; continue }
            let need: Int
            switch c {
            case 0xC2...0xDF: need = 1
            case 0xE0...0xEF: need = 2
            case 0xF0...0xF4: need = 3
            default: need = 0
            }
            // Uppercased 3-byte lead: 2-byte lead + two continuation bytes.
            if (0xC0...0xCF).contains(c), conts(i + 1, 2) {
                out.append(c + 0x20); out.append(b[i + 1]); out.append(b[i + 2])
                i += 3
                continue
            }
            if need > 0, conts(i + 1, need) {
                out.append(contentsOf: b[i...(i + need)])
                i += need + 1
                continue
            }
            // Lowercased 2-byte lead: one continuation byte, then not another.
            if (0xE2...0xFE).contains(c), conts(i + 1, 1), !(i + 2 < n && isContinuation(b[i + 2])) {
                out.append(c - 0x20); out.append(b[i + 1])
                i += 2
                continue
            }
            return nil
        }
        return String(bytes: out, encoding: .utf8)
    }
}

/// Rewrites the string values of a Mapbox Vector Tile (protobuf) through `MojibakeRepair`.
enum VectorTileRepair {
    /// The repaired tile, or nil when nothing needed repair (or the data is not a plain MVT).
    static func repair(_ data: Data) -> Data? {
        let bytes = [UInt8](data)
        guard !bytes.isEmpty, !(bytes.count > 1 && bytes[0] == 0x1F && bytes[1] == 0x8B) else { return nil } // gzip: not ours
        var changed = false
        var out: [UInt8] = []
        out.reserveCapacity(bytes.count)
        let ok = forEachField(bytes) { field, wire, raw, payload in
            if field == 3, wire == 2, let payload, let layer = repairLayer(payload) {
                changed = true
                appendLengthDelimited(field: 3, layer, to: &out)
            } else {
                out.append(contentsOf: raw)
            }
        }
        return ok && changed ? Data(out) : nil
    }

    /// Layer: values are field 4; a Value's string is its field 1.
    private static func repairLayer(_ layer: ArraySlice<UInt8>) -> [UInt8]? {
        var changed = false
        var out: [UInt8] = []
        out.reserveCapacity(layer.count)
        let ok = forEachField(Array(layer)) { field, wire, raw, payload in
            if field == 4, wire == 2, let payload, let value = repairValue(payload) {
                changed = true
                appendLengthDelimited(field: 4, value, to: &out)
            } else {
                out.append(contentsOf: raw)
            }
        }
        return ok && changed ? out : nil
    }

    private static func repairValue(_ value: ArraySlice<UInt8>) -> [UInt8]? {
        var fixed: [UInt8]?
        let ok = forEachField(Array(value)) { field, wire, _, payload in
            guard field == 1, wire == 2, let payload, let text = String(bytes: payload, encoding: .utf8),
                  let repaired = MojibakeRepair.repair(text) else { return }
            var out: [UInt8] = []
            appendLengthDelimited(field: 1, Array(repaired.utf8), to: &out)
            fixed = out
        }
        return ok ? fixed : nil
    }

    // MARK: Protobuf wire format

    /// Calls `body(field, wireType, rawBytesOfTheWholeField, lengthDelimitedPayload?)` per field.
    /// Returns false on malformed input.
    @discardableResult
    private static func forEachField(_ b: [UInt8], _ body: (Int, Int, ArraySlice<UInt8>, ArraySlice<UInt8>?) -> Void) -> Bool {
        var i = 0
        while i < b.count {
            let start = i
            guard let key = readVarint(b, &i) else { return false }
            let field = Int(key >> 3), wire = Int(key & 7)
            var payload: ArraySlice<UInt8>?
            switch wire {
            case 0: guard readVarint(b, &i) != nil else { return false }
            case 1: i += 8
            case 2:
                guard let len = readVarint(b, &i), len <= UInt64(b.count - i) else { return false }
                payload = b[i..<(i + Int(len))]
                i += Int(len)
            case 5: i += 4
            default: return false
            }
            guard i <= b.count else { return false }
            body(field, wire, b[start..<i], payload)
        }
        return true
    }

    private static func readVarint(_ b: [UInt8], _ i: inout Int) -> UInt64? {
        var result: UInt64 = 0
        var shift: UInt64 = 0
        while i < b.count, shift < 64 {
            let c = b[i]
            i += 1
            result |= UInt64(c & 0x7F) << shift
            if c < 0x80 { return result }
            shift += 7
        }
        return nil
    }

    private static func appendVarint(_ v: UInt64, to out: inout [UInt8]) {
        var v = v
        while v >= 0x80 {
            out.append(UInt8(v & 0x7F) | 0x80)
            v >>= 7
        }
        out.append(UInt8(v))
    }

    private static func appendLengthDelimited(field: Int, _ payload: [UInt8], to out: inout [UInt8]) {
        appendVarint(UInt64(field << 3 | 2), to: &out)
        appendVarint(UInt64(payload.count), to: &out)
        out.append(contentsOf: payload)
    }
}

/// Hooks MapLibre's network layer so Goong vector tiles are repaired before parsing/caching.
final class GoongTileRepairer: NSObject, MLNNetworkConfigurationDelegate, @unchecked Sendable {
    // @unchecked: stateless; MapLibre calls it from background threads.
    private static let shared = GoongTileRepairer()
    private static let cacheKey = "map.tileRepair.cacheVersion"
    private static let cacheVersion = 1

    /// Idempotent; call before the first `MLNMapView` is created.
    @MainActor
    static func install(defaults: UserDefaults = .standard) {
        let config = MLNNetworkConfiguration.sharedManager
        guard config.delegate !== shared else { return }
        config.delegate = shared
        // Tiles cached before the repair existed would be served as-is; drop them once.
        if defaults.integer(forKey: cacheKey) < cacheVersion {
            MLNOfflineStorage.shared.clearAmbientCache { _ in }
            defaults.set(cacheVersion, forKey: cacheKey)
        }
    }

    static func shouldRepair(_ url: URL?) -> Bool {
        guard let url, url.host?.hasSuffix("goong.io") == true else { return false }
        return url.path.hasPrefix("/tiles/") && url.path.hasSuffix(".pbf")
    }

    func didReceive(_ response: MLNNetworkResponse) -> MLNNetworkResponse {
        guard Self.shouldRepair(response.response?.url), let data = response.data,
              let fixed = VectorTileRepair.repair(data) else { return response }
        response.data = fixed
        return response
    }
}
