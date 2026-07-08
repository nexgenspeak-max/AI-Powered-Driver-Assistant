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
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiCard: { defaultProps: { elevation: 0 } },
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8 } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
  },
})
