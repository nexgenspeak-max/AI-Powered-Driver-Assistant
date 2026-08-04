export type DriverStatus = 'online' | 'offline' | 'locked'

export interface Driver {
  id: string
  phone: string
  name: string
  status: DriverStatus
  vehicle_type?: string
  vehicle_plate?: string
  vehicle_name?: string
  created_at: string
  updated_at: string
}
