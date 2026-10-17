import Svg, { Path, Rect } from 'react-native-svg'

// The Czen brand mark: an open "C" ring with three voice bars in its mouth.
// Same geometry as assets/icon.png so the app icon, the splash and the
// assistant orb all read as one identity.
export function CzenMark({ size = 28, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Path
        d="M741.8 704.8 A300 300 0 1 1 741.8 319.2"
        fill="none"
        stroke={color}
        strokeWidth={96}
        strokeLinecap="round"
      />
      <Rect x={539} y={437} width={62} height={150} rx={31} fill={color} />
      <Rect x={624} y={382} width={62} height={260} rx={31} fill={color} />
      <Rect x={709} y={417} width={62} height={190} rx={31} fill={color} />
    </Svg>
  )
}
