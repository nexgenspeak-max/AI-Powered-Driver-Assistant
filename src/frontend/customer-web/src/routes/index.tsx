import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuthStore } from '../stores/authStore'


const BookingPage    = lazy(() => import('../pages/BookingPage'))
const TripStatusPage = lazy(() => import('../pages/TripStatusPage'))
const HomePage       = lazy(() => import('../pages/HomePage'))
const LoginPage      = lazy(() => import('../pages/LoginPage'))
const RegisterPage   = lazy(() => import('../pages/RegisterPage'))
const AboutPage      = lazy(() => import('../pages/AboutPage'))
const FaqPage        = lazy(() => import('../pages/FaqPage'))


const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: '#1a1f36' }}>
    <CircularProgress sx={{ color: '#6c8aff' }} />
  </Box>
)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const customer = useAuthStore(s => s.customer)
  return customer ? <>{children}</> : <Navigate to="/login" replace />
}
function GuestRoute({ children }: { children: React.ReactNode }) {
  const customer = useAuthStore(s => s.customer)
  return customer ? <Navigate to="/" replace /> : <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/"          element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/booking"   element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/trip/:id"  element={<ProtectedRoute><TripStatusPage /></ProtectedRoute>} />
        <Route path="/about"     element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
        <Route path="/faq"       element={<ProtectedRoute><FaqPage /></ProtectedRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
