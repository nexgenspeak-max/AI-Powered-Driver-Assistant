import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebarCollapsed: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    set => ({
      sidebarCollapsed: false,
      setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'customer-web-ui',
      partialize: s => ({ sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
)
