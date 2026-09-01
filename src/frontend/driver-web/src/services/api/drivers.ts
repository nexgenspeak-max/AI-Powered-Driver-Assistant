import { apiClient } from './client'
import type { Driver, DriverContext, DriverProfile, TodayEarnings, EarningsSummary, Bonus } from '../../types'

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

  updateLocation: (lat: number, lng: number) =>
    apiClient.post('/drivers/me/location', { lat, lng }).then(r => r.data),

  updateLiveLocation: (lat: number, lng: number) =>
    apiClient.post('/drivers/me/location/live', { lat, lng }).then(r => r.data),
}
