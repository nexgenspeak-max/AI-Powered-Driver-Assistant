import { useEffect } from 'react'
import { useAdminLocaleStore } from './adminLocaleStore'

/** Keeps `<html lang>` in sync with persisted admin locale. */
export function AdminLocaleSync() {
  const locale = useAdminLocaleStore(s => s.locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
