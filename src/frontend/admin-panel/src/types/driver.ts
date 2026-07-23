export type DriverStatus = 'online' | 'offline' | 'locked'

export interface Driver {
  id: string
  phone: string
  name: string
  fcm_token: string
  status: DriverStatus
  registered_at: string
  updated_at: string
}
