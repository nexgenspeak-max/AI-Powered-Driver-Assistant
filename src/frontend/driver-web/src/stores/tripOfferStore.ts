import { create } from 'zustand'

interface TripOfferState {
  tripId: string | null
  show: (tripId: string) => void
  dismiss: () => void
}

export const useTripOfferStore = create<TripOfferState>(set => ({
  tripId: null,
  show: tripId => set({ tripId }),
  dismiss: () => set({ tripId: null }),
}))
