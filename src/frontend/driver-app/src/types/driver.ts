export type DriverStatus = 'online' | 'offline'

export interface Driver {
  phone: string
  name: string
  fcm_token: string
  status: DriverStatus
  registered_at: string
  updated_at: string
}
