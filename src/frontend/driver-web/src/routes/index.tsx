import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuthStore } from '../stores/authStore'
import { PALETTE } from '../styles/palette'
import RegisterPage from '../pages/RegisterPage'

const LoginPage       = lazy(() => import('../pages/LoginPage'))
const DashboardPage   = lazy(() => import('../pages/DashboardPage'))
const EarningsPage    = lazy(() => import('../pages/EarningsPage'))
const ProfilePage     = lazy(() => import('../pages/ProfilePage'))
const EditProfilePage = lazy(() => import('../pages/EditProfilePage'))
const VehiclePage     = lazy(() => import('../pages/VehiclePage'))
const SupportPage     = lazy(() => import('../pages/SupportPage'))
const SafetyPage      = lazy(() => import('../pages/SafetyPage'))
const TermsPage       = lazy(() => import('../pages/TermsPage'))
const HomePage        = lazy(() => import('../pages/HomePage'))
const AboutPage       = lazy(() => import('../pages/AboutPage'))
const FaqPage         = lazy(() => import('../pages/FaqPage'))

const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: PALETTE.background }}>
    <CircularProgress sx={{ color: PALETTE.primary }} />
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
        <Route path="/earnings" element={<ProtectedRoute><EarningsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/vehicle" element={<ProtectedRoute><VehiclePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/safety" element={<ProtectedRoute><SafetyPage /></ProtectedRoute>} />
        <Route path="/terms" element={<ProtectedRoute><TermsPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
        <Route path="/faq" element={<ProtectedRoute><FaqPage /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
