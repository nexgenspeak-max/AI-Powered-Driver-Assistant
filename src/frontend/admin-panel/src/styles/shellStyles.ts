import type { SxProps, Theme } from '@mui/material'
import { PALETTE } from './palette'

/** Shared table chrome for dark shell — no light/white surfaces. */
export const tableHeadRowSx: SxProps<Theme> = {
  bgcolor: PALETTE.shellTableHead,
}

export const tableHeadCellSx: SxProps<Theme> = {
  py: 1.25,
  borderBottom: `1px solid ${PALETTE.shellBorder}`,
}

export const tableEmptyCellSx: SxProps<Theme> = {
  py: 6,
  color: 'text.secondary',
}

export const tableRowSx: SxProps<Theme> = {
  '&:last-child td': { borderBottom: 0 },
  '&:hover': { bgcolor: 'rgba(167,139,250,0.04)' },
}

export const sectionGap = 3

export const contentMaxWidth = 1440
