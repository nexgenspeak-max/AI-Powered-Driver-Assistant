import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_ADMIN_LOCALE,
  isAdminLocale,
  type AdminLocale,
} from './localeRegistry'

type AdminLocaleState = {
  locale: AdminLocale
  setLocale: (locale: AdminLocale) => void
}

export const useAdminLocaleStore = create<AdminLocaleState>()(
  persist(
    set => ({
      locale: DEFAULT_ADMIN_LOCALE,
      setLocale: locale => set({ locale }),
    }),
    {
      name: 'admin-panel-locale',
      version: 1,
      partialize: s => ({ locale: s.locale }),
      migrate: persisted => {
        const row = persisted as { locale?: unknown } | undefined
        if (row && isAdminLocale(row.locale)) return { locale: row.locale }
        return { locale: DEFAULT_ADMIN_LOCALE }
      },
    },
  ),
)
