import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { ROUTES } from '../constants'
import { useAuthStore } from '../stores/authStore'

const TripBoardPage  = lazy(() => import('../pages/TripBoardPage'))
const CreateTripPage = lazy(() => import('../pages/CreateTripPage'))
const DriversPage    = lazy(() => import('../pages/DriversPage'))
const CallLogsPage   = lazy(() => import('../pages/CallLogsPage'))
const LoginPage      = lazy(() => import('../pages/LoginPage'))
const CustomerPage   = lazy(() => import('../pages/CustomerPage'))
function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const admin = useAuthStore(s => s.admin)
  return admin ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const admin = useAuthStore(s => s.admin)
  return admin ? <Navigate to={ROUTES.TRIP_BOARD} replace /> : <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.LOGIN} element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path={ROUTES.TRIP_BOARD}  element={<ProtectedRoute><TripBoardPage /></ProtectedRoute>} />
        <Route path={ROUTES.CREATE_TRIP} element={<ProtectedRoute><CreateTripPage /></ProtectedRoute>} />
        <Route path={ROUTES.DRIVERS}     element={<ProtectedRoute><DriversPage /></ProtectedRoute>} />
        <Route path={ROUTES.CALL_LOGS}   element={<ProtectedRoute><CallLogsPage /></ProtectedRoute>} />
        <Route path={ROUTES.CUSTOMERS}   element={<ProtectedRoute><CustomerPage /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  )
}
