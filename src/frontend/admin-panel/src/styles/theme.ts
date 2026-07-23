import { createTheme } from '@mui/material/styles'
import { PALETTE } from './palette'

export const theme = createTheme({
  breakpoints: {
    // xs = mobile (<768), sm = tablet/iPad (768-1024), md+ = desktop (>=1024)
    values: { xs: 0, sm: 768, md: 1024, lg: 1280, xl: 1536 },
  },
  palette: {
    background: { default: PALETTE.pale },
    primary: { main: PALETTE.base, light: PALETTE.light, dark: PALETTE.darkest },
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
          border: `1px solid ${PALETTE.border}`,
          boxShadow: `0 1px 2px ${PALETTE.base}0a`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 10, fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: PALETTE.border },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
})
