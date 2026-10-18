import { createTheme, alpha } from '@mui/material/styles'
import { PALETTE } from './palette'

const FONT = '"Inter", "SF Pro Text", "Segoe UI", Roboto, sans-serif'

export const theme = createTheme({
  breakpoints: {
    values: { xs: 0, sm: 768, md: 1024, lg: 1280, xl: 1536 },
  },
  palette: {
    mode: 'dark',
    background: { default: PALETTE.shellContent, paper: PALETTE.shellPanel },
    primary: { main: PALETTE.mid, light: PALETTE.light, dark: PALETTE.base, contrastText: '#ffffff' },
    secondary: { main: PALETTE.info },
    success: { main: PALETTE.success },
    warning: { main: PALETTE.warning },
    error: { main: PALETTE.danger },
    info: { main: PALETTE.info },
    text: { primary: PALETTE.shellHeading, secondary: PALETTE.shellMuted },
    divider: PALETTE.shellBorder,
  },
  typography: {
    fontFamily: FONT,
    fontSize: 14,
    h4: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontSize: 16, fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body2: { fontSize: 13.5 },
    caption: { fontSize: 12 },
    button: { fontWeight: 600, letterSpacing: 0 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: PALETTE.shellContent, WebkitFontSmoothing: 'antialiased' },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(167,139,250,0.18)', borderRadius: 8, border: '2px solid transparent', backgroundClip: 'content-box' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${PALETTE.shellBorder}`, backgroundColor: PALETTE.shellPanel, backgroundImage: 'none' } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ ownerState }) => ({
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
          paddingInline: 16,
          ...(ownerState.variant === 'contained' && (ownerState.color ?? 'primary') === 'primary'
            ? {
                backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                '&:hover': { backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' },
                '&.Mui-disabled': { backgroundImage: 'none' },
              }
            : {}),
        }),
        outlined: {
          borderColor: PALETTE.shellBorderStrong,
          color: PALETTE.shellText,
          '&:hover': { borderColor: PALETTE.light, backgroundColor: PALETTE.shellNavHover },
        },
        sizeSmall: { paddingInline: 12, minHeight: 32 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600, fontSize: 12 },
        sizeSmall: { height: 24 },
        outlined: { borderColor: PALETTE.shellBorderStrong },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: PALETTE.shellBorder, color: 'inherit', paddingTop: 12, paddingBottom: 12 },
        head: {
          backgroundColor: PALETTE.shellTableHead,
          color: PALETTE.shellMuted,
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&:hover': { backgroundColor: 'rgba(167,139,250,0.04)' } } } },
    MuiTablePagination: {
      styleOverrides: { root: { color: PALETTE.shellMuted, borderTop: `1px solid ${PALETTE.shellBorder}` } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(11, 9, 22, 0.6)',
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: PALETTE.shellBorderStrong },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(PALETTE.light, 0.5) },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PALETTE.mid, borderWidth: 1 },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { backgroundColor: PALETTE.shellElevated, border: `1px solid ${PALETTE.shellBorderStrong}`, fontSize: 12 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { backgroundColor: PALETTE.shellPanel, border: `1px solid ${PALETTE.shellBorder}`, borderRadius: 16 } },
    },
    MuiMenu: {
      styleOverrides: { paper: { backgroundColor: PALETTE.shellElevated, border: `1px solid ${PALETTE.shellBorder}` } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderColor: PALETTE.shellBorder,
          color: PALETTE.shellMuted,
          textTransform: 'none',
          '&.Mui-selected': { backgroundColor: PALETTE.shellNavActive, color: PALETTE.shellHeading, '&:hover': { backgroundColor: PALETTE.shellNavActive } },
        },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 40 } } },
  },
})
