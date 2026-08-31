import { Paper, type PaperProps } from '@mui/material'
import { PALETTE } from '../styles/palette'

export function SettingsPanel({ children, sx, ...rest }: PaperProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: `1px solid ${PALETTE.shellBorder}`,
        bgcolor: PALETTE.shellPanel,
        overflow: 'hidden',
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Paper>
  )
}
