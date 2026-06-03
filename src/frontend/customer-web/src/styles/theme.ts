import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    background: { default: '#f0f2f8' },
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
