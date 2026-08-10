import PendingActionsIcon from '@mui/icons-material/PendingActions'
import BoltIcon from '@mui/icons-material/Bolt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi'
import type { Trip } from '../../../types/trip'
import type { Driver } from '../../../types/driver'
import { PALETTE } from '../../../styles/palette'
import { StatCardGrid } from '../../../components/StatCard'

type Props = {
  trips: Trip[]
  drivers: Driver[]
}

export function TripStatCards({ trips, drivers }: Props) {
  const pending   = trips.filter(t => t.status === 'pending').length
  const active    = trips.filter(t => ['notified', 'calling', 'confirmed', 'arrived_pickup', 'picked_up'].includes(t.status)).length
  const completed = trips.filter(t => t.status === 'completed').length
  const online    = drivers.filter(d => d.status === 'online').length

  const stats = [
    { label: 'Pending',        value: pending,   color: '#f59e0b', icon: <PendingActionsIcon fontSize="small" /> },
    { label: 'Active',         value: active,    color: PALETTE.base, icon: <BoltIcon fontSize="small" /> },
    { label: 'Completed',      value: completed, color: '#4ade80', icon: <CheckCircleIcon fontSize="small" /> },
    { label: 'Drivers Online', value: online,    color: '#22d3ee', icon: <LocalTaxiIcon fontSize="small" /> },
  ]

  return <StatCardGrid stats={stats} />
}
