import { createTheme } from '@mui/material/styles'
import { PALETTE } from './palette'

export const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 768, md: 1024, lg: 1280, xl: 1536 },
  },
  palette: {
    mode: 'dark',
    background: {
      default: PALETTE.shellContent,
      paper: PALETTE.shellPanel,
    },
    primary: { main: PALETTE.light, light: '#ddd6fe', dark: PALETTE.base },
    success: { main: PALETTE.success },
    error: { main: PALETTE.danger },
    text: {
      primary: '#e8e8e8',
      secondary: PALETTE.shellMuted,
    },
    divider: PALETTE.shellBorder,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${PALETTE.shellBorder}`,
          bgcolor: PALETTE.shellPanel,
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 10, fontWeight: 600 },
        outlined: {
          borderColor: PALETTE.shellBorder,
          '&:hover': { borderColor: 'rgba(255,255,255,0.22)', bgcolor: 'rgba(255,255,255,0.04)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
        outlined: { borderColor: PALETTE.shellBorder },
        filled: { bgcolor: 'rgba(124, 91, 156, 0.35)' },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: PALETTE.shellBorder,
          color: 'inherit',
        },
        head: {
          bgcolor: PALETTE.shellTableHead,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', bgcolor: PALETTE.shellPanel },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            bgcolor: 'rgba(0,0,0,0.15)',
            '& fieldset': { borderColor: PALETTE.shellBorder },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: PALETTE.shellBorder,
          color: 'text.secondary',
          '&.Mui-selected': {
            bgcolor: 'rgba(124, 91, 156, 0.28)',
            color: 'text.primary',
            '&:hover': { bgcolor: 'rgba(124, 91, 156, 0.35)' },
          },
        },
      },
    },
  },
})
