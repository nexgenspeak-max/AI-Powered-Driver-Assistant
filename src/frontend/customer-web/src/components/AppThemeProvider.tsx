import { useMemo } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { useThemeStore } from '../stores/themeStore'
import { createAppTheme } from '../styles/theme'

export default function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore(s => s.mode)
  const theme = useMemo(() => createAppTheme(mode), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
