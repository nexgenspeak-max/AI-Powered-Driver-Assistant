import { BrowserRouter } from 'react-router-dom'
import { QueryProvider } from './providers/QueryProvider'
import AppThemeProvider from './components/AppThemeProvider'
import { AppRoutes } from './routes'
import VoiceSessionWidget from './components/VoiceSessionWidget'
import DispatchHooks from './components/DispatchHooks'
import TripOfferBanner from './features/dashboard/components/TripOfferBanner'
import { preloadCzenFillers } from './utils/czenFillerAudio'

preloadCzenFillers()

export default function App() {
  return (
    <AppThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <DispatchHooks />
          <AppRoutes />
          <VoiceSessionWidget />
          <TripOfferBanner />
        </BrowserRouter>
      </QueryProvider>
    </AppThemeProvider>
  )
}
