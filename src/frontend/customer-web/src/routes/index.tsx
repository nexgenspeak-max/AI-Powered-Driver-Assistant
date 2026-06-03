import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'

const BookingPage    = lazy(() => import('../pages/BookingPage'))
const TripStatusPage = lazy(() => import('../pages/TripStatusPage'))

const Loader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh', bgcolor: '#1a1f36' }}>
    <CircularProgress sx={{ color: '#6c8aff' }} />
  </Box>
)

export function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/"          element={<BookingPage />} />
        <Route path="/trip/:id"  element={<TripStatusPage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
