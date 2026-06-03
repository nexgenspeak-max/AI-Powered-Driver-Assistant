import { apiClient } from './client'
import type { Driver } from '../../types'

export const driversService = {
  login: (payload: { phone: string; name: string }) =>
    apiClient.post<Driver>('/drivers', payload).then(r => r.data),

  update: (phone: string, payload: Partial<Driver>) =>
    apiClient.patch<Driver>(`/drivers/${phone}`, payload).then(r => r.data),
}
