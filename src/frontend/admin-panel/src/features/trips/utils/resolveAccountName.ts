import type { Customer, Trip } from '../../../types'

// Looks up the real account name behind a trip's id_account (matched against
// local-driver-assistant-accounts, role=customer). Returns undefined when the
// trip isn't linked to a known account — e.g. guest bookings taken by phone.
export function resolveAccountName(trip: Trip, customers: Customer[]): string | undefined {
  if (!trip.id_account) return undefined
  return customers.find(c => c.id === trip.id_account)?.name
}
