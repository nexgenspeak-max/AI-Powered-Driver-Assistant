import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { ROUTES } from '../constants'

const TripBoardPage  = lazy(() => import('../pages/TripBoardPage'))
const CreateTripPage = lazy(() => import('../pages/CreateTripPage'))
const DriversPage    = lazy(() => import('../pages/DriversPage'))
const CallLogsPage   = lazy(() => import('../pages/CallLogsPage'))

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <CircularProgress />
    </Box>
  )
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.TRIP_BOARD}  element={<TripBoardPage />} />
        <Route path={ROUTES.CREATE_TRIP} element={<CreateTripPage />} />
        <Route path={ROUTES.DRIVERS}     element={<DriversPage />} />
        <Route path={ROUTES.CALL_LOGS}   element={<CallLogsPage />} />
      </Routes>
    </Suspense>
  )
}
