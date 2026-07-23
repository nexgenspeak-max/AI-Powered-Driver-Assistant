import PeopleIcon from '@mui/icons-material/People'
import WifiIcon from '@mui/icons-material/Wifi'
import LockIcon from '@mui/icons-material/Lock'
import type { Customer } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { StatCardGrid } from '../../../components/StatCard'

type Props = { customers: Customer[] }

export function CustomerStatCards({ customers }: Props) {
  const online = customers.filter(c => c.status === 'online').length
  const locked = customers.filter(c => c.status === 'locked').length

  const stats = [
    { label: 'Total Customers', value: customers.length, color: PALETTE.base, icon: <PeopleIcon fontSize="small" /> },
    { label: 'Online',          value: online,           color: '#4ade80',    icon: <WifiIcon fontSize="small" /> },
    { label: 'Locked',          value: locked,           color: '#f87171',    icon: <LockIcon fontSize="small" /> },
  ]

  return <StatCardGrid stats={stats} />
}
