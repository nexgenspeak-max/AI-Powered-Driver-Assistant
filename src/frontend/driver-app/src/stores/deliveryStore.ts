import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storage } from '../utils/storage'
import type { DeliveryOrder } from '../types'

interface DeliveryState {
  orders: DeliveryOrder[]
  addOrder: (order: Omit<DeliveryOrder, 'id' | 'created_at'>) => void
  removeOrder: (id: string) => void
}

// Local-only store — no delivery API exists on the backend yet, so orders
// created here live purely on-device (persisted so they survive app
// restarts) until a real trip-service endpoint replaces this.
export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: order =>
        set({
          orders: [
            { ...order, id: `local-${Date.now()}`, created_at: new Date().toISOString() },
            ...get().orders,
          ],
        }),
      removeOrder: id => set({ orders: get().orders.filter(o => o.id !== id) }),
    }),
    {
      name: 'delivery-orders',
      storage: createJSONStorage(() => storage),
    },
  ),
)
