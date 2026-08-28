export type { Trip, TripStatus, CreateTripPayload } from './trip'
export type { Driver, DriverStatus } from './driver'
export type { CustomerContext } from './customerContext'

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  status: 'online' | 'offline'
  created_at: string
  updated_at: string
}
