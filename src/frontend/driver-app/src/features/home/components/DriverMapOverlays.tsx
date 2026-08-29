import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { MAP_OVERLAY_BOTTOM_CLEARANCE } from '../../../constants'
import { useDriverMapModel } from '../hooks/useDriverMapModel'
import { DRIVER_COLOR } from '../lib/mapConstants'
import { NavigationHud } from './NavigationHud'
import { OptimizedRoutePanel } from './OptimizedRoutePanel'

const OPTIMIZED_ROUTE_PANEL_COLLAPSED_HEIGHT = 72

export function DriverMapOverlays({ model }: { model: ReturnType<typeof useDriverMapModel> }) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  const {
    navActive,
    setNavActive,
    nav,
    optimizedRoute,
    colorByTripId,
    navigationTarget,
    startNavigation,
  } = model

  if (navActive) {
    return (
      <NavigationHud
        loading={nav.loading}
        error={nav.error}
        step={nav.steps[nav.currentStepIndex] ?? null}
        distanceToManeuverM={nav.distanceToManeuverM}
        remainingKm={nav.remainingKm}
        remainingMin={nav.remainingMin}
        arrived={nav.arrived}
        onExit={() => setNavActive(false)}
        onRefresh={nav.refresh}
      />
    )
  }

  return (
    <>
      {optimizedRoute && (
        <OptimizedRoutePanel
          route={optimizedRoute}
          colorForTripId={tripId => colorByTripId[tripId] ?? DRIVER_COLOR}
        />
      )}
      {navigationTarget && (
        <Pressable
          onPress={startNavigation}
          accessibilityRole="button"
          accessibilityLabel="Bắt đầu chỉ đường"
          style={{
            position: 'absolute',
            right: 16,
            bottom:
              insets.bottom +
              MAP_OVERLAY_BOTTOM_CLEARANCE +
              (optimizedRoute ? OPTIMIZED_ROUTE_PANEL_COLLAPSED_HEIGHT : 0),
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: DRIVER_COLOR,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <Ionicons name="navigate" size={24} color={theme.textInverse.val} />
        </Pressable>
      )}
    </>
  )
}
