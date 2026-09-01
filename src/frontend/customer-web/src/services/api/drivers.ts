import { apiClient } from './client'
import type { Driver } from '../../types'

export const driversService = {
  listOnline: () =>
    apiClient.get<Driver[]>('/drivers/online').then(r => r.data),
}
