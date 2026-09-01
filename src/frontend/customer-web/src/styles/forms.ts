import type { SxProps, Theme } from '@mui/material'
import { PALETTE } from './palette'

export const fieldSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '16px',
    backgroundColor: 'rgba(255,255,255,0.55)',
    '& fieldset': { borderColor: PALETTE.borderStrong },
    '&:hover fieldset': { borderColor: PALETTE.primary },
    '&.Mui-focused fieldset': { borderColor: PALETTE.primary, borderWidth: '1.5px' },
  },
}

export const primaryButtonSx: SxProps<Theme> = {
  py: 1.5,
  minHeight: 52,
  borderRadius: '14px',
  fontWeight: 700,
  fontSize: '1rem',
  background: `linear-gradient(135deg, ${PALETTE.gradientStart} 0%, ${PALETTE.gradientEnd} 100%)`,
  boxShadow: `0 8px 24px ${PALETTE.primaryMuted}`,
  '&:hover': {
    background: `linear-gradient(135deg, ${PALETTE.primaryPress} 0%, ${PALETTE.gradientEnd} 100%)`,
  },
}

export const authSceneSx: SxProps<Theme> = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  p: 3,
  bgcolor: PALETTE.authScreenBg,
}

export const authCardSx: SxProps<Theme> = {
  width: '100%',
  maxWidth: 384,
  borderRadius: 3,
  bgcolor: PALETTE.authCardBg,
  border: `1px solid ${PALETTE.outline}`,
  boxShadow: '0 10px 14px rgba(0,0,0,0.14)',
}

export const pageSceneSx: SxProps<Theme> = {
  minHeight: '100dvh',
  bgcolor: PALETTE.background,
}

export const contentShellSx: SxProps<Theme> = {
  maxWidth: 480,
  mx: 'auto',
  px: 2.5,
  py: 2.5,
  pb: 4,
}
