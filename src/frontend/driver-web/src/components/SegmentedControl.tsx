import { Box, Typography } from '@mui/material'
import { PALETTE } from '../styles/palette'

export type SegmentOption<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <Box
      sx={{
        display: 'flex',
        p: 0.5,
        borderRadius: '14px',
        bgcolor: PALETTE.surfaceVariant,
        minHeight: 48,
      }}
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            onClick={() => onChange(option.value)}
            sx={{
              flex: 1,
              border: 'none',
              cursor: 'pointer',
              borderRadius: '14px',
              minHeight: 40,
              px: 1,
              bgcolor: active ? 'transparent' : 'transparent',
              background: active
                ? `linear-gradient(135deg, ${PALETTE.gradientStart} 0%, ${PALETTE.gradientEnd} 100%)`
                : 'transparent',
              boxShadow: active ? `0 4px 12px ${PALETTE.primaryMuted}` : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: active ? 700 : 600,
                color: active ? '#fff' : PALETTE.textSecondary,
                fontSize: { xs: 11, sm: 13 },
                lineHeight: 1.3,
              }}
            >
              {option.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
