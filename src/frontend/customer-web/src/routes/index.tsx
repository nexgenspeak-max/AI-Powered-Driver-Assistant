import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuthStore } from '../stores/authStore'
import { PALETTE } from '../styles/palette'

const BookingPage     = lazy(() => import('../pages/BookingPage'))
const TripsPage       = lazy(() => import('../pages/TripsPage'))
const ProfilePage     = lazy(() => import('../pages/ProfilePage'))
const EditProfilePage = lazy(() => import('../pages/EditProfilePage'))
const SupportPage     = lazy(() => import('../pages/SupportPage'))
const SafetyPage      = lazy(() => import('../pages/SafetyPage'))
const TermsPage       = lazy(() => import('../pages/TermsPage'))
const ReferralPage    = lazy(() => import('../pages/ReferralPage'))
const TripStatusPage  = lazy(() => import('../pages/TripStatusPage'))
const HomePage        = lazy(() => import('../pages/HomePage'))
const LoginPage       = lazy(() => import('../pages/LoginPage'))
const RegisterPage    = lazy(() => import('../pages/RegisterPage'))
const AboutPage       = lazy(() => import('../pages/AboutPage'))
const FaqPage         = lazy(() => import('../pages/FaqPage'))

const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: PALETTE.background }}>
    <CircularProgress sx={{ color: PALETTE.primary }} />
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
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><TripsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
        <Route path="/safety" element={<ProtectedRoute><SafetyPage /></ProtectedRoute>} />
        <Route path="/terms" element={<ProtectedRoute><TermsPage /></ProtectedRoute>} />
        <Route path="/referral" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/trip/:id" element={<ProtectedRoute><TripStatusPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
        <Route path="/faq" element={<ProtectedRoute><FaqPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
