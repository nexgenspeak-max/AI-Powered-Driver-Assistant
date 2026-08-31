import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { ROUTES } from '../constants'
import { useAuthStore } from '../stores/authStore'

const OverviewPage = lazy(() => import('../pages/OverviewPage'))
const AgentPage = lazy(() => import('../pages/AgentPage'))
const ToolsPage = lazy(() => import('../pages/ToolsPage'))
const PromptsPage = lazy(() => import('../pages/PromptsPage'))
const LogsPage = lazy(() => import('../pages/LogsPage'))
const CallsPage = lazy(() => import('../pages/CallsPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />
}

function GuestRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user)
  return user ? <Navigate to={ROUTES.OVERVIEW} replace /> : <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path={ROUTES.OVERVIEW} element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
        <Route path={ROUTES.AGENT} element={<ProtectedRoute><AgentPage /></ProtectedRoute>} />
        <Route path={ROUTES.TOOLS} element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />
        <Route path={ROUTES.PROMPTS} element={<ProtectedRoute><PromptsPage /></ProtectedRoute>} />
        <Route path={ROUTES.LOGS} element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
        <Route path={ROUTES.CALLS} element={<ProtectedRoute><CallsPage /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  )
}
