import { BrowserRouter, useLocation } from 'react-router-dom'
import { ThemeProvider } from '../providers/ThemeProvider'
import { QueryProvider } from '../providers/QueryProvider'
import { AdminLocaleSync } from '../i18n/AdminLocaleSync'
import { SettingsShellLayout } from '../layouts/SettingsShellLayout'
import { AppRoutes } from '../routes'
import { ROUTES } from '../constants'

function AppShell() {
  const { pathname } = useLocation()
  if (pathname === ROUTES.LOGIN) return <AppRoutes />
  return (
    <SettingsShellLayout>
      <AppRoutes />
    </SettingsShellLayout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <AdminLocaleSync />
          <AppShell />
        </BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  )
}
