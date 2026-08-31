import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  tripStatusFilter: string
  setTripStatusFilter: (filter: string) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    set => ({
      tripStatusFilter: '',
      setTripStatusFilter: filter => set({ tripStatusFilter: filter }),
      sidebarCollapsed: false,
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'admin-panel-ui',
      partialize: s => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
)
