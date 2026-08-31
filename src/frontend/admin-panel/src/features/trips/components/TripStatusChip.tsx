import { Chip } from '@mui/material'
import type { TripStatus } from '../../../types'
import { TRIP_STATUS_COLORS, normalizeTripStatus } from '../../../constants/status'
import { useAdminContent } from '../../../i18n/useAdminContent'

export function TripStatusChip({ status }: { status: TripStatus }) {
  const { tripStatusLabel } = useAdminContent()
  const normalized = normalizeTripStatus(status)
  return (
    <Chip
      label={tripStatusLabel(normalized)}
      color={TRIP_STATUS_COLORS[normalized] ?? 'default'}
      size="small"
    />
  )
}
