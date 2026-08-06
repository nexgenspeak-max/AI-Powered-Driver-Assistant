import { create } from 'zustand'

interface TripOfferState {
  tripId: string | null
  show: (tripId: string) => void
  dismiss: () => void
}

// Set by useDispatchSocket.ts on the 'trip_offer' WebSocket event, read by
// TripOfferBanner.tsx (mounted once in app/(app)/_layout.tsx, visible on
// every tab) — separate from react-query's driverContext cache since this
// is transient UI state ("show this one banner right now"), not server data.
export const useTripOfferStore = create<TripOfferState>(set => ({
  tripId: null,
  show: tripId => set({ tripId }),
  dismiss: () => set({ tripId: null }),
}))
