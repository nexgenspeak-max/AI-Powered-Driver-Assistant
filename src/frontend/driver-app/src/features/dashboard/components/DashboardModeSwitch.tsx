import { TouchableOpacity } from 'react-native'
import { View, Text, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export type DashboardMode = 'trips' | 'delivery'

const TRACK_HEIGHT = 52
const TRACK_PADDING = 4

interface Props {
  mode: DashboardMode
  onChange: (mode: DashboardMode) => void
}

// Track's drop shadow (shadowColor/shadowOpacity/shadowRadius) removed — on
// real Android devices it rendered as a hard, visible gray outline around
// the whole track instead of a soft blur, same issue as GlassSurface's own
// outer shadow (see the `showShadow` note in GlassSurface.tsx).

// Two-way "Chuyến đi / Giao hàng" segmented switch sitting above the
// dashboard's scroll content. Each segment gets an explicit height (not a
// `flex: 1` chained through an ancestor with no defined height of its own —
// that combination collapsed the whole bar to 0px on native Yoga, while
// React Native Web's more forgiving CSS flexbox still rendered *something*,
// just badly proportioned) — the active segment's own background switches
// to the purple gradient instead of a separately width-measured sliding
// pill overlay, so there's no cross-platform layout math left to get wrong.
export function DashboardModeSwitch({ mode, onChange }: Props) {
  const isLight = useThemeName() === 'light'

  const trackBackground = isLight ? '#F0EEF6' : 'rgba(255,255,255,0.06)'
  const inactiveColor = isLight ? '#6B7280' : '#9CA3AF'

  const renderSegment = (
    key: DashboardMode,
    icon: 'car-sport' | 'cube',
    label: string,
  ) => {
    const active = mode === key
    const content = (
      <View
        height={TRACK_HEIGHT - TRACK_PADDING * 2}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap="$2"
      >
        <Ionicons name={icon} size={16} color={active ? '#ffffff' : inactiveColor} />
        <Text fontSize={14} fontWeight="700" color={active ? '#ffffff' : '$textSecondary'}>
          {label}
        </Text>
      </View>
    )

    return (
      <TouchableOpacity
        key={key}
        style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
        activeOpacity={0.85}
        onPress={() => onChange(key)}
      >
        {active ? (
          <LinearGradient colors={['#6D28D9', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            {content}
          </LinearGradient>
        ) : (
          content
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View
      height={TRACK_HEIGHT}
      flexDirection="row"
      padding={TRACK_PADDING}
      gap="$2"
      borderRadius={16}
      backgroundColor={trackBackground}
    >
      {renderSegment('trips', 'car-sport', 'Chuyến đi')}
      {renderSegment('delivery', 'cube', 'Giao hàng')}
    </View>
  )
}
