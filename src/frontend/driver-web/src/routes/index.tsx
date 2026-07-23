import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuthStore } from '../stores/authStore'
import RegisterPage from '../pages/RegisterPage'

const LoginPage     = lazy(() => import('../pages/LoginPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const HomePage      = lazy(() => import('../pages/HomePage'))
const AboutPage     = lazy(() => import('../pages/AboutPage'))
const FaqPage       = lazy(() => import('../pages/FaqPage'))
const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: '#1a1f36' }}>
    <CircularProgress sx={{ color: '#6c8aff' }} />
  </Box>
)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const driver = useAuthStore(s => s.driver)
  return driver ? <>{children}</> : <Navigate to="/login" replace />
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const driver = useAuthStore(s => s.driver)
  return driver ? <Navigate to="/" replace /> : <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
         <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
        <Route path="/faq" element={<ProtectedRoute><FaqPage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
