import { apiClient } from './client'
import type { Driver } from '../../types'

export const driversService = {
  // Lets the customer pick who drives them, instead of the app auto-
  // matching by location — see features/booking/components/DriverPicker.tsx.
  listOnline: () =>
    apiClient.get<Driver[]>('/drivers/online').then(r => r.data),
}
