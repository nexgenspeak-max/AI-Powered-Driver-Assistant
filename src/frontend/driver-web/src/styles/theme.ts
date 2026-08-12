import { createTheme } from '@mui/material/styles'
import { PALETTE } from './palette'

export const theme = createTheme({
  breakpoints: {
    // xs = mobile (<768), sm = tablet/iPad (768-1024), md+ = desktop (>=1024)
    values: { xs: 0, sm: 768, md: 1024, lg: 1280, xl: 1536 },
  },
  palette: {
    background: { default: PALETTE.pale },
    primary: { main: '#6c8aff' },
    success: { main: '#4ade80' },
    error: { main: '#f87171' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiCard: { defaultProps: { elevation: 0 } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiFormHelperText: {
      styleOverrides: {
        // MUI renders this as a <p>, and the app-wide `p { margin: 0 }`
        // reset (index.css) strips its default `3px 14px 0` margin —
        // without it, error/hint text sits flush against the field's left
        // edge instead of lined up with the input's own text, reading as
        // clipped/misaligned. Restored explicitly here.
        root: { margin: '3px 14px 0' },
      },
    },
  },
})
