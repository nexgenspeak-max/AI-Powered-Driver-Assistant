import { apiClient } from './client'
import type { Customer } from '../../types'

export const customersService = {
  list: () =>
    apiClient.get<Customer[]>('/api/v1/customers').then(r => r.data),
}
