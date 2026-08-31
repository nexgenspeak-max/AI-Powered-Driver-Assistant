import PendingActionsIcon from '@mui/icons-material/PendingActions'
import BoltIcon from '@mui/icons-material/Bolt'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalTaxiIcon from '@mui/icons-material/LocalTaxi'
import type { Trip } from '../../../types/trip'
import type { Driver } from '../../../types/driver'
import { PALETTE } from '../../../styles/palette'
import { StatCardGrid } from '../../../components/StatCard'
import { useAdminContent } from '../../../i18n/useAdminContent'

type Props = {
  trips: Trip[]
  drivers: Driver[]
}

export function TripStatCards({ trips, drivers }: Props) {
  const { c } = useAdminContent()
  const pending   = trips.filter(t => t.status === 'pending').length
  const active    = trips.filter(t => ['notified', 'calling', 'confirmed', 'arrived_pickup', 'picked_up'].includes(t.status)).length
  const completed = trips.filter(t => t.status === 'completed').length
  const online    = drivers.filter(d => d.status === 'online').length

  const stats = [
    { label: c.stats.pending,        value: pending,   color: PALETTE.warning, icon: <PendingActionsIcon fontSize="small" /> },
    { label: c.stats.active,         value: active,    color: PALETTE.light, icon: <BoltIcon fontSize="small" /> },
    { label: c.stats.completed,      value: completed, color: PALETTE.success, icon: <CheckCircleIcon fontSize="small" /> },
    { label: c.stats.driversOnline, value: online,    color: PALETTE.info, icon: <LocalTaxiIcon fontSize="small" /> },
  ]

  return <StatCardGrid stats={stats} />
}
