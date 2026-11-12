import MapLibre
import SwiftUI

/// What the map draws; a value type so SwiftUI can diff it.
struct MapScene: Equatable {
    struct Stop: Equatable {
        var id: String
        var coordinate: LatLng
        var pickup: Bool
        var name: String
        var order: Int
        var colorHex: UInt32
    }

    enum Camera: Equatable {
        case follow(LatLng)
        case navigate(LatLng, bearing: Double)
        case fit([LatLng])
    }

    var driver: LatLng?
    var stops: [Stop] = []
    var routePath: [LatLng] = []
    var navPath: [LatLng] = []
    var camera: Camera = .fit([])
    var recenterToken = 0
}

/// MapLibre map with the Goong style (`DriverMap.tsx`). Logo and compass hidden.
struct DriverMapView: UIViewRepresentable {
    var styleURL: URL?
    var scene: MapScene

    static let hanoi = CLLocationCoordinate2D(latitude: 21.0278, longitude: 105.8342)

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> MLNMapView {
        GoongTileRepairer.install()
        let map = MLNMapView(frame: .zero, styleURL: styleURL ?? URL(string: "https://demotiles.maplibre.org/style.json"))
        map.delegate = context.coordinator
        map.logoView.isHidden = true
        map.compassView.isHidden = true
        map.attributionButton.isHidden = true
        map.setCenter(Self.hanoi, zoomLevel: 12, animated: false)
        map.accessibilityLabel = "Bản đồ"
        context.coordinator.map = map
        return map
    }

    func updateUIView(_ map: MLNMapView, context: Context) {
        context.coordinator.apply(scene)
    }

    @MainActor
    final class Coordinator: NSObject, @preconcurrency MLNMapViewDelegate {
        weak var map: MLNMapView?
        private var styleLoaded = false
        private var current = MapScene()
        private var applied: MapScene?
        private var annotations: [String: MLNPointAnnotation] = [:]
        private var keys: [ObjectIdentifier: String] = [:]
        private var images: [String: UIImage] = [:]
        private var hadFix = false

        func apply(_ scene: MapScene) {
            current = scene
            guard styleLoaded, let map else { return }
            let previous = applied
            applied = scene
            if previous?.routePath != scene.routePath || previous?.navPath != scene.navPath || previous == nil {
                updateLines(map: map, scene: scene)
            }
            if previous?.stops != scene.stops || previous?.driver != scene.driver || previous == nil {
                updateAnnotations(map: map, scene: scene)
            }
            if previous?.camera != scene.camera || previous?.recenterToken != scene.recenterToken {
                moveCamera(map: map, scene: scene, previous: previous)
            }
        }

        // MARK: Lines

        private func updateLines(map: MLNMapView, scene: MapScene) {
            guard let style = map.style else { return }
            setLine(style: style, id: "optimized-route", coords: scene.navPath.isEmpty ? scene.routePath : [], color: UIColor(red: 0x8B / 255, green: 0x5C / 255, blue: 0xF6 / 255, alpha: 1), width: 4, opacity: 0.85)
            setLine(style: style, id: "nav-route", coords: scene.navPath, color: UIColor(red: 0x25 / 255, green: 0x63 / 255, blue: 0xEB / 255, alpha: 1), width: 6, opacity: 0.9)
        }

        private func setLine(style: MLNStyle, id: String, coords: [LatLng], color: UIColor, width: Double, opacity: Double) {
            var points = coords.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng) }
            // MapLibre throws for a polyline with fewer than two points.
            let shapes: [MLNShape & MLNFeature] = points.count >= 2 ? [MLNPolylineFeature(coordinates: &points, count: UInt(points.count))] : []
            let shape = MLNShapeCollectionFeature(shapes: shapes)
            if let source = style.source(withIdentifier: id) as? MLNShapeSource {
                source.shape = shape
                return
            }
            let source = MLNShapeSource(identifier: id, shape: shape, options: nil)
            style.addSource(source)
            let casing = MLNLineStyleLayer(identifier: "\(id)-casing", source: source)
            casing.lineColor = NSExpression(forConstantValue: UIColor.white)
            casing.lineWidth = NSExpression(forConstantValue: width + 3)
            casing.lineOpacity = NSExpression(forConstantValue: opacity * 0.9)
            casing.lineCap = NSExpression(forConstantValue: "round")
            casing.lineJoin = NSExpression(forConstantValue: "round")
            style.addLayer(casing)
            let layer = MLNLineStyleLayer(identifier: id, source: source)
            layer.lineColor = NSExpression(forConstantValue: color)
            layer.lineWidth = NSExpression(forConstantValue: width)
            layer.lineOpacity = NSExpression(forConstantValue: opacity)
            layer.lineCap = NSExpression(forConstantValue: "round")
            layer.lineJoin = NSExpression(forConstantValue: "round")
            style.addLayer(layer)
        }

        // MARK: Markers

        private func updateAnnotations(map: MLNMapView, scene: MapScene) {
            var wanted: [String: (LatLng, UIImage, String)] = [:]
            if let d = scene.driver { wanted["driver"] = (d, image(key: "driver") { DriverMarker() }, "Vị trí của bạn") }
            for stop in scene.stops {
                let key = "stop-\(stop.id)-\(stop.pickup)-\(stop.order)-\(stop.name)-\(stop.colorHex)"
                wanted[key] = (stop.coordinate, image(key: key) { StopMarker(stop: stop) }, "\(stop.order). \(stop.pickup ? "Đón" : "Trả") \(stop.name)")
            }
            for (key, ann) in annotations where wanted[key] == nil {
                map.removeAnnotation(ann)
                annotations[key] = nil
                keys[ObjectIdentifier(ann)] = nil
            }
            for (key, value) in wanted {
                let coord = CLLocationCoordinate2D(latitude: value.0.lat, longitude: value.0.lng)
                if let ann = annotations[key] {
                    ann.coordinate = coord
                } else {
                    let ann = MLNPointAnnotation()
                    ann.coordinate = coord
                    ann.title = value.2
                    annotations[key] = ann
                    keys[ObjectIdentifier(ann)] = key
                    map.addAnnotation(ann)
                }
            }
        }

        private func image<V: View>(key: String, _ view: () -> V) -> UIImage {
            if let cached = images[key] { return cached }
            let renderer = ImageRenderer(content: view())
            renderer.scale = UITraitCollection.current.displayScale > 0 ? UITraitCollection.current.displayScale : 3
            let img = renderer.uiImage ?? UIImage()
            images[key] = img
            return img
        }

        func mapView(_ mapView: MLNMapView, imageFor annotation: MLNAnnotation) -> MLNAnnotationImage? {
            guard let key = keys[ObjectIdentifier(annotation)], let img = images[key] else { return nil }
            if let reused = mapView.dequeueReusableAnnotationImage(withIdentifier: key) { return reused }
            // Anchor stop pills at their bottom tip; the driver at its centre.
            let anchored = key == "driver" ? img : img.withAlignmentRectInsets(UIEdgeInsets(top: 0, left: 0, bottom: img.size.height / 2, right: 0))
            return MLNAnnotationImage(image: anchored, reuseIdentifier: key)
        }

        func mapView(_ mapView: MLNMapView, annotationCanShowCallout annotation: MLNAnnotation) -> Bool { false }

        // MARK: Camera

        private func moveCamera(map: MLNMapView, scene: MapScene, previous: MapScene?) {
            let size = map.bounds.size == .zero ? CGSize(width: 390, height: 844) : map.bounds.size
            func camera(_ p: LatLng, zoom: Double, pitch: CGFloat, heading: Double) -> MLNMapCamera {
                let c = CLLocationCoordinate2D(latitude: p.lat, longitude: p.lng)
                let altitude = MLNAltitudeForZoomLevel(zoom, pitch, c.latitude, size)
                return MLNMapCamera(lookingAtCenter: c, altitude: altitude, pitch: pitch, heading: heading)
            }
            switch scene.camera {
            case let .navigate(p, bearing):
                map.setCamera(camera(p, zoom: 17.5, pitch: 45, heading: bearing), withDuration: 0.5, animationTimingFunction: nil)
            case let .follow(p):
                let wasNavigating: Bool = { if case .navigate = previous?.camera { return true }; return false }()
                let first = !hadFix
                hadFix = true
                let recenter = previous?.recenterToken != scene.recenterToken
                let duration = first ? 0.6 : (recenter || wasNavigating ? 0.5 : 0.8)
                let zoom = (first || recenter || wasNavigating) ? 15 : max(map.zoomLevel, 13)
                map.setCamera(camera(p, zoom: zoom, pitch: 0, heading: 0), withDuration: duration, animationTimingFunction: nil)
            case let .fit(points):
                guard !points.isEmpty else { return }
                if points.count == 1 {
                    map.setCamera(camera(points[0], zoom: 14, pitch: 0, heading: 0), withDuration: 0.6, animationTimingFunction: nil)
                } else {
                    var coords = points.map { CLLocationCoordinate2D(latitude: $0.lat, longitude: $0.lng) }
                    map.setVisibleCoordinates(&coords, count: UInt(coords.count), edgePadding: UIEdgeInsets(top: 100, left: 60, bottom: 60, right: 60), animated: true)
                }
            }
        }

        func mapView(_ mapView: MLNMapView, didFinishLoading style: MLNStyle) {
            styleLoaded = true
            applied = nil
            apply(current)
        }
    }
}

/// 44 pt white circle, #8B5CF6 border, van image.
struct DriverMarker: View {
    var body: some View {
        ZStack {
            Circle().fill(Color(hex: 0x8B5CF6).opacity(0.22)).frame(width: 60, height: 60)
            Circle().fill(.white).frame(width: 44, height: 44)
                .overlay(Circle().stroke(Color(hex: 0x8B5CF6), lineWidth: 3))
                .shadow(color: .black.opacity(0.25), radius: 4, y: 2)
            Image("DriverVan").resizable().scaledToFit().frame(width: 30, height: 30)
        }
        .frame(width: 62, height: 62)
    }
}

/// Stop pill: trip colour, pin (pickup) or flag (dropoff), name and order badge.
struct StopMarker: View {
    var stop: MapScene.Stop
    var body: some View {
        let color = Color(hex: stop.colorHex)
        VStack(spacing: 0) {
            HStack(spacing: 5) {
                Text("\(stop.order)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(color)
                    .frame(width: 18, height: 18)
                    .background(.white, in: Circle())
                Image(systemName: stop.pickup ? "mappin" : "flag.fill").font(.system(size: 11, weight: .bold))
                Text(stop.name).font(.system(size: 12, weight: .semibold)).lineLimit(1)
            }
            .foregroundStyle(.white)
            .padding(.leading, 4)
            .padding(.trailing, 10)
            .padding(.vertical, 4)
            .background(color, in: Capsule())
            .overlay(Capsule().stroke(.white, lineWidth: 1.5))
            Triangle().fill(color).frame(width: 12, height: 7)
        }
        .fixedSize()
        .shadow(color: .black.opacity(0.25), radius: 3, y: 2)
        .padding(4)
    }
}

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        Path { p in
            p.move(to: CGPoint(x: rect.minX, y: rect.minY))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
            p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
            p.closeSubpath()
        }
    }
}
