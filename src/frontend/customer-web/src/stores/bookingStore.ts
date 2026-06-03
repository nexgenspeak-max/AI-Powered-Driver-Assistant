import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BookingState {
  activeTripId: string | null
  setActiveTripId: (id: string | null) => void
}

export const useBookingStore = create<BookingState>()(
  persist(
    set => ({
      activeTripId: null,
      setActiveTripId: id => set({ activeTripId: id }),
    }),
    { name: 'booking-store' },
  ),
)
