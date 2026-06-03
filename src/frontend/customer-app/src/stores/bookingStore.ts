import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../utils/storage'

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
    {
      name: 'booking-store',
      storage: createJSONStorage(() => storage),
    },
  ),
)
