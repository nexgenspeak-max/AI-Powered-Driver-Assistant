import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '../providers/ThemeProvider'
import { QueryProvider } from '../providers/QueryProvider'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { AppRoutes } from '../routes'

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <DashboardLayout>
            <AppRoutes />
          </DashboardLayout>
        </BrowserRouter>
      </QueryProvider>
    </ThemeProvider>
  )
}
