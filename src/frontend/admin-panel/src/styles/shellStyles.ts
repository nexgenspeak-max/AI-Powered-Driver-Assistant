import type { SxProps, Theme } from '@mui/material'
import { PALETTE } from './palette'

/** Shared table chrome for dark shell — no light/white surfaces. */
export const tableHeadRowSx: SxProps<Theme> = {
  bgcolor: PALETTE.shellTableHead,
}

export const tableHeadCellSx: SxProps<Theme> = {
  fontWeight: 600,
  fontSize: 12,
  color: 'text.secondary',
  py: 1.25,
  borderBottom: `1px solid ${PALETTE.shellBorder}`,
}

export const tableEmptyCellSx: SxProps<Theme> = {
  py: 6,
  color: 'text.secondary',
}

export const tableRowSx: SxProps<Theme> = {
  '&:last-child td': { borderBottom: 0 },
  '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
}

export const sectionGap = 3

export const contentMaxWidth = 1080
