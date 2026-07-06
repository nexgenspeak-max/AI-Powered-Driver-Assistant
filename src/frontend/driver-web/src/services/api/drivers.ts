import { apiClient } from './client'
import type { Driver } from '../../types'

export const driversService = {
  update: (phone: string, payload: Partial<Driver>) =>
    apiClient.patch<Driver>(`/drivers/${phone}`, payload).then(r => r.data),
}
