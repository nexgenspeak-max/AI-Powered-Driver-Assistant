import { createTheme, type Theme } from '@mui/material/styles'
import { PALETTE } from './palette'

export function createAppTheme(mode: 'light' | 'dark'): Theme {
  const isDark = mode === 'dark'
  return createTheme({
    breakpoints: {
      values: { xs: 0, sm: 768, md: 1024, lg: 1280, xl: 1536 },
    },
    palette: {
      mode,
      background: {
        default: isDark ? '#0f1419' : PALETTE.background,
        paper: isDark ? '#1a1f28' : PALETTE.surface,
      },
      primary: { main: PALETTE.primary, light: PALETTE.mid, dark: PALETTE.primaryPress },
      text: {
        primary: isDark ? '#f3f4f6' : PALETTE.textPrimary,
        secondary: isDark ? '#9ca3af' : PALETTE.textSecondary,
      },
      success: { main: PALETTE.success, light: PALETTE.successContainer },
      warning: { main: PALETTE.warning, light: PALETTE.warningContainer },
      error: { main: PALETTE.danger, light: PALETTE.dangerContainer },
      info: { main: PALETTE.info, light: PALETTE.infoContainer },
      divider: isDark ? 'rgba(255,255,255,0.08)' : PALETTE.divider,
    },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.02em', fontSize: 28 },
      h5: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 22 },
      h6: { fontWeight: 600, fontSize: 18 },
      body1: { fontSize: 15 },
      body2: { fontSize: 13 },
      caption: { fontSize: 12 },
    },
    shape: { borderRadius: 14 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { bgcolor: isDark ? '#0f1419' : PALETTE.background },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: 24,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : PALETTE.outline}`,
            backgroundImage: 'none',
            bgcolor: isDark ? '#1a1f28' : PALETTE.surfaceElevated,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 14,
            fontWeight: 600,
            minHeight: 44,
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            bgcolor: isDark ? '#141820' : PALETTE.surface,
            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : PALETTE.border}`,
          },
        },
      },
    },
  })
}

/** @deprecated use createAppTheme('light') */
export const theme = createAppTheme('light')
