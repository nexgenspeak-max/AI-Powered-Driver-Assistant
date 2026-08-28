import { TextInput, TouchableOpacity, View as RNView } from 'react-native'
import { View, useTheme, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSheen, getGlassShadow } from './LiquidGlass'

const HEIGHT = 40
const RADIUS = 14
const GLASS_BG_LIGHT = 'rgba(255,255,255,0.55)'
const GLASS_BG_DARK = 'rgba(36,29,44,0.72)'

interface Props {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
}

// Compact search field — same "glass" recipe as Input.tsx (shadow on a
// non-clipping outer view, fill/border on an inner clipped one) but with a
// leading search icon and a trailing clear button instead of a label. Fixed
// `height` (not padding-driven) keeps it visually lighter than a form field
// — a search bar sitting above a list should read as a compact filter
// affordance, not another input to fill out.
export function SearchInput({ value, onChangeText, placeholder }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'

  return (
    <View style={getGlassShadow(isLight)}>
      <RNView
        style={{
          height: HEIGHT,
          borderRadius: RADIUS,
          overflow: 'hidden',
          backgroundColor: isLight ? GLASS_BG_LIGHT : GLASS_BG_DARK,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          gap: 8,
        }}
      >
        <GlassSheen borderRadius={RADIUS} />
        <Ionicons name="search" size={16} color={theme.textMuted.val} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted.val}
          selectionColor={isLight ? '#8B5CF6' : '#C084FC'}
          style={{
            flex: 1,
            height: HEIGHT,
            fontSize: 13,
            color: theme.textPrimary.val,
          }}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted.val} />
          </TouchableOpacity>
        )}
      </RNView>
    </View>
  )
}
