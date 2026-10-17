import { useDriverMapModel } from '../hooks/useDriverMapModel'
import { GoOnlineCard } from './GoOnlineCard'
import { MapStatusPill } from './MapStatusPill'
import { NavigationHud } from './NavigationHud'
import { NextStopCard } from './NextStopCard'

/**
 * Map chrome: the turn-by-turn HUD while navigating; otherwise the status
 * pill + recenter button on top and the next-stop card at the bottom.
 * Multi-stop order itself stays on the map polyline/markers + voice.
 */
export function DriverMapOverlays({ model }: { model: ReturnType<typeof useDriverMapModel> }) {
  const {
    navActive,
    setNavActive,
    nav,
    nextStop,
    optimizedRoute,
    startNavigation,
    recenter,
    isOnline,
    activeTripCount,
    hasContext,
    todayEarnings,
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
        rerouting={nav.rerouting}
        onExit={() => setNavActive(false)}
        onRefresh={nav.refresh}
      />
    )
  }

  return (
    <>
      <MapStatusPill isOnline={isOnline} activeTripCount={activeTripCount} onRecenter={recenter} />
      {nextStop ? (
        <NextStopCard
          stop={nextStop}
          totalStops={optimizedRoute?.stops.length ?? 1}
          onNavigate={startNavigation}
        />
      ) : hasContext && !isOnline ? (
        <GoOnlineCard today={todayEarnings} />
      ) : null}
    </>
  )
}
