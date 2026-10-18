import type { TripStatus } from '../../../types'
import { TRIP_STATUS_COLORS, normalizeTripStatus } from '../../../constants/status'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { StatusPill } from '../../../components/StatusPill'

export function TripStatusChip({ status }: { status: TripStatus }) {
  const { tripStatusLabel } = useAdminContent()
  const normalized = normalizeTripStatus(status)
  return <StatusPill label={tripStatusLabel(normalized)} tone={TRIP_STATUS_COLORS[normalized] ?? 'default'} />
}
