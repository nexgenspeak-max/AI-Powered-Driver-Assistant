import { create } from 'zustand'

interface UiState {
  tripStatusFilter: string
  setTripStatusFilter: (filter: string) => void
}

export const useUiStore = create<UiState>(set => ({
  tripStatusFilter: '',
  setTripStatusFilter: filter => set({ tripStatusFilter: filter }),
}))
