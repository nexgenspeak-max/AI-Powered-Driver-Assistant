import { Box, Stack, Typography } from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import { PALETTE } from '../../../styles/palette'
import type { TripStatus } from '../../../types'

const STEPS: { status: TripStatus; label: string }[] = [
  { status: 'confirmed', label: 'Đã nhận' },
  { status: 'arrived_pickup', label: 'Đã đến' },
  { status: 'picked_up', label: 'Đón khách' },
]

export default function TripProgressStepper({ status }: { status: TripStatus }) {
  const currentIndex = STEPS.findIndex(s => s.status === status)

  return (
    <Stack direction="row" sx={{ width: '100%', alignItems: 'flex-start' }}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        return (
          <Stack key={step.status} sx={{ flex: i === STEPS.length - 1 ? 0 : 1, alignItems: 'center', minWidth: 56 }}>
            <Box
              sx={{
                width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: isDone ? PALETTE.success : 'transparent',
                border: isCurrent ? `2px solid ${PALETTE.success}` : isDone ? 'none' : `1.5px solid ${PALETTE.borderStrong}`,
              }}
            >
              {isDone ? <CheckIcon sx={{ fontSize: 12, color: '#fff' }} /> : null}
              {isCurrent && !isDone ? (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: PALETTE.success }} />
              ) : null}
            </Box>
            <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center', color: isCurrent ? PALETTE.textPrimary : PALETTE.textSecondary }}>
              {step.label}
            </Typography>
            {i < STEPS.length - 1 ? (
              <Box sx={{ position: 'absolute', left: '50%', top: 9, width: '100%', height: 2, bgcolor: isDone ? PALETTE.success : PALETTE.border, zIndex: -1 }} />
            ) : null}
          </Stack>
        )
      })}
    </Stack>
  )
}
