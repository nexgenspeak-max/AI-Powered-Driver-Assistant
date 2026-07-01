import { Chip } from '@mui/material'
import type { TripStatus } from '../../../types'
import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../../../constants/status'

export function TripStatusChip({ status }: { status: TripStatus }) {
  return (
    <Chip
      label={TRIP_STATUS_LABELS[status]}
      color={TRIP_STATUS_COLORS[status]}
      size="small"
    />
  )
}
