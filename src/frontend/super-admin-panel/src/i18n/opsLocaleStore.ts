import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_OPS_LOCALE,
  isOpsLocale,
  type OpsLocale,
} from './localeRegistry'

type OpsLocaleState = {
  locale: OpsLocale
  setLocale: (locale: OpsLocale) => void
}

export const useOpsLocaleStore = create<OpsLocaleState>()(
  persist(
    set => ({
      locale: DEFAULT_OPS_LOCALE,
      setLocale: locale => set({ locale }),
    }),
    {
      name: 'super-admin-locale',
      version: 1,
      partialize: s => ({ locale: s.locale }),
      migrate: persisted => {
        const row = persisted as { locale?: unknown } | undefined
        if (row && isOpsLocale(row.locale)) return { locale: row.locale }
        return { locale: DEFAULT_OPS_LOCALE }
      },
    },
  ),
)
