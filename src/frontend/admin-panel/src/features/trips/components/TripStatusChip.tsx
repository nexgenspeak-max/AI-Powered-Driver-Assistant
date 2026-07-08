import { Chip } from '@mui/material'
import type { TripStatus } from '../../../types'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS, normalizeTripStatus } from '../../../constants/status'

export function TripStatusChip({ status }: { status: TripStatus }) {
  const normalized = normalizeTripStatus(status)
  return (
    <Chip
      label={TRIP_STATUS_LABELS[normalized] ?? status}
      color={TRIP_STATUS_COLORS[normalized] ?? 'default'}
      size="small"
    />
  )
}
