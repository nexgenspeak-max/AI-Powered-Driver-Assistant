import { apiClient } from './client'
import type { CustomerContext } from '../../types'

export const customersService = {
  // Backend resolves the customer from the caller's own JWT (see routes/
  // customers.ts's `me/context` — falls back to req.user.phone for a
  // role=customer token) — no header/id needed, mirrors driver-app's
  // driversService.getContext().
  getContext: (fresh = false) =>
    apiClient.get<CustomerContext>('/customers/me/context', { params: fresh ? { fresh: 'true' } : {} }).then(r => r.data),
}
