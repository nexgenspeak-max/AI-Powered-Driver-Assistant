import { StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeName } from 'tamagui'
import { CzenMark } from '../../../components/CzenMark'

const TILE = 132

// Landing hero = the app icon itself, large. One shape, one brand color —
// the same thing the driver tapped on the home screen a second ago.
export function BrandHero() {
  const isLight = useThemeName() === 'light'
  return (
    <View style={styles.wrap}>
      <View style={[styles.halo, { opacity: isLight ? 0.12 : 0.22 }]} />
      <View style={styles.tile}>
        <LinearGradient
          colors={['#5B21B6', '#7C3AED', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.6, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Absolute + zIndex: on web, positioned gradient layers paint above
            static siblings regardless of DOM order, so the mark must be
            positioned too or it disappears under the highlight. */}
        <View style={styles.mark} pointerEvents="none">
          <CzenMark size={TILE * 0.72} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', width: TILE + 80, height: TILE + 80 },
  halo: {
    position: 'absolute',
    width: TILE + 80,
    height: TILE + 80,
    borderRadius: (TILE + 80) / 2,
    backgroundColor: '#7C3AED',
  },
  mark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: TILE * 0.28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
})
