import { useMemo } from 'react'
import { OPS_MESSAGES } from './messages'
import { useOpsLocaleStore } from './opsLocaleStore'
import type { OpsLocale } from './localeRegistry'

export function useOpsLocale() {
  const locale = useOpsLocaleStore(s => s.locale)
  const setLocale = useOpsLocaleStore(s => s.setLocale)
  const t = useMemo(() => OPS_MESSAGES[locale], [locale])
  return { locale, setLocale, t }
}

export function getOpsMessages(locale: OpsLocale) {
  return OPS_MESSAGES[locale]
}
