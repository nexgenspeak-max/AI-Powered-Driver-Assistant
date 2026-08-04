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

// Set by useCustomerDispatchSocket.ts when the driver the customer picked
// answers (accept/reject), read by TripNotificationBanner.tsx (mounted once
// in app/_layout.tsx so it's visible on every screen, not just trip status).
export const useTripNotificationStore = create<TripNotificationState>(set => ({
  notification: null,
  show: n => set({ notification: n }),
  dismiss: () => set({ notification: null }),
}))
