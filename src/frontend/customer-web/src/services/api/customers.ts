import { apiClient } from './client'
import type { CustomerContext } from '../../types'

export const customersService = {
  getContext: (fresh = false) =>
    apiClient.get<CustomerContext>('/customers/me/context', { params: fresh ? { fresh: 'true' } : {} }).then(r => r.data),
}
