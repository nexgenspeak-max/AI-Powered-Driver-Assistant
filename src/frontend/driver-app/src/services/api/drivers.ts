import { apiClient } from './client'
import type { Driver, DriverContext, DriverProfile, TodayEarnings, EarningsSummary, Bonus, NavigationRoute } from '../../types'

export const driversService = {
  update: (phone: string, payload: Partial<Pick<Driver, 'name' | 'status'>>) =>
    apiClient.patch<Driver>(`/drivers/${phone}`, payload).then(r => r.data),

  getContext: (fresh = false) =>
    apiClient.get<DriverContext>('/drivers/me/context', { params: fresh ? { fresh: 'true' } : {} }).then(r => r.data),

  getProfile: () =>
    apiClient.get<DriverProfile>('/drivers/me/profile').then(r => r.data),

  getEarningsToday: () =>
    apiClient.get<TodayEarnings>('/drivers/me/earnings/today').then(r => r.data),

  getEarningsSummary: (period: 'week' | 'month') =>
    apiClient.get<EarningsSummary>('/drivers/me/earnings/summary', { params: { period } }).then(r => r.data),

  getBonuses: () =>
    apiClient.get<Bonus[]>('/drivers/me/bonuses').then(r => r.data),

  // Periodic GPS ping while online (~every 10 min, see locationTracking.ts)
  // — not tied to a specific trip, unlike tripsService.updateLocation. Also
  // runs the proximity/customer-notification checks server-side, so keep
  // this on its slow cadence — see updateLiveLocation for the frequent one.
  updateLocation: (lat: number, lng: number) =>
    apiClient.post('/drivers/me/location', { lat, lng }).then(r => r.data),

  // Location ping from the foreground GPS stream (see
  // useLiveDriverLocation.ts for its actual cadence — first-fix-immediate,
  // then ~10min steady state) plus the targeted trip-event pushes — refreshes
  // driverLiveLocationKey/route-order data and runs the same proximity
  // checks as updateLocation. `proximityScope` narrows that check to just
  // one of the two features ('notify' = 1km call-offer, 'suggest' = 200m
  // next-stop) — used by assistant-settings.tsx right when a driver flips
  // ON one specific toggle, so the resulting check can't fire the OTHER
  // feature's message instead just because it also happened to be enabled
  // and in range. Omit for the default 'both' (every other caller).
  updateLiveLocation: (lat: number, lng: number, proximityScope?: 'notify' | 'suggest') =>
    apiClient.post('/drivers/me/location/live', { lat, lng, proximity_scope: proximityScope }).then(r => r.data),

  // Turn-by-turn steps for ONE leg (driver's current fix -> a single target
  // point) — powers the in-app navigation HUD (see useTurnByTurnNavigation).
  // Stateless: always pass the freshest coords this device has, not
  // whatever's cached server-side.
  getNavigation: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
    apiClient
      .get<NavigationRoute>('/drivers/me/navigation', {
        params: { from_lat: from.lat, from_lng: from.lng, to_lat: to.lat, to_lng: to.lng },
      })
      .then(r => r.data),
}
