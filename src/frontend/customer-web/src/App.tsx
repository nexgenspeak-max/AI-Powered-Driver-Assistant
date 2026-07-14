import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { QueryProvider } from './providers/QueryProvider'
import { AppRoutes } from './routes'
import { theme } from './styles/theme'
import VoiceSessionWidget from './components/VoiceSessionWidget'

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryProvider>
        <BrowserRouter>
          <AppRoutes />
          <VoiceSessionWidget />
        </BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  )
}
