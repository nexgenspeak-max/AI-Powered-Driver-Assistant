import { useCallback } from 'react'
import type { TripStatus } from '../types/trip'
import { normalizeTripStatus } from '../constants/status'
import { ADMIN_MESSAGES } from './messages'
import { useAdminLocale } from './useAdminLocale'

export function useAdminContent() {
  const { t, locale, setLocale } = useAdminLocale()
  const c = t.content

  const tripStatusLabel = useCallback(
    (status: string) => {
      const key = normalizeTripStatus(status)
      return c.tripStatus[key] ?? status
    },
    [c.tripStatus],
  )

  const accountStatusLabel = useCallback(
    (status: string) => {
      if (status === 'online') return c.common.online
      if (status === 'offline') return c.common.offline
      if (status === 'locked') return c.common.locked
      return status
    },
    [c.common],
  )

  return { t, c, locale, setLocale, tripStatusLabel, accountStatusLabel }
}

export function getTripStatusLabel(locale: 'en' | 'vi', status: TripStatus): string {
  const key = normalizeTripStatus(status)
  return ADMIN_MESSAGES[locale].content.tripStatus[key] ?? status
}
