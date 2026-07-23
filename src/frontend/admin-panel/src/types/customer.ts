export type CustomerStatus = 'online' | 'offline' | 'locked'

export interface Customer {
  id: string
  phone: string
  name: string
  email?: string
  status: CustomerStatus
  created_at: string
  updated_at: string
}
