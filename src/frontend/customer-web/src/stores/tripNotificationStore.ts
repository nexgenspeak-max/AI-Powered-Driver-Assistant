import { create } from 'zustand'

export type TripNotificationEvent = 'trip_confirmed' | 'trip_rejected'

interface TripNotification {
  tripId: string
  event: TripNotificationEvent
}

interface TripNotificationState {
  notification: TripNotification | null
  show: (n: TripNotification) => void
  dismiss: () => void
}

export const useTripNotificationStore = create<TripNotificationState>(set => ({
  notification: null,
  show: n => set({ notification: n }),
  dismiss: () => set({ notification: null }),
}))
