import { useMemo } from 'react'
import { ADMIN_MESSAGES } from './messages'
import { useAdminLocaleStore } from './adminLocaleStore'
import type { AdminLocale } from './localeRegistry'

export function useAdminLocale() {
  const locale = useAdminLocaleStore(s => s.locale)
  const setLocale = useAdminLocaleStore(s => s.setLocale)

  const t = useMemo(() => ADMIN_MESSAGES[locale], [locale])

  return { locale, setLocale, t }
}

export function getAdminMessages(locale: AdminLocale) {
  return ADMIN_MESSAGES[locale]
}
