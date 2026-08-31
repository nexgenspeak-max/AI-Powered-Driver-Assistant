import PeopleIcon from '@mui/icons-material/People'
import WifiIcon from '@mui/icons-material/Wifi'
import LockIcon from '@mui/icons-material/Lock'
import type { Customer } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { StatCardGrid } from '../../../components/StatCard'
import { useAdminContent } from '../../../i18n/useAdminContent'

type Props = { customers: Customer[] }

export function CustomerStatCards({ customers }: Props) {
  const { c } = useAdminContent()
  const online = customers.filter(cust => cust.status === 'online').length
  const locked = customers.filter(cust => cust.status === 'locked').length

  const stats = [
    { label: c.stats.totalCustomers, value: customers.length, color: PALETTE.light, icon: <PeopleIcon fontSize="small" /> },
    { label: c.common.online,        value: online,           color: PALETTE.success, icon: <WifiIcon fontSize="small" /> },
    { label: c.common.locked,        value: locked,           color: PALETTE.danger, icon: <LockIcon fontSize="small" /> },
  ]

  return <StatCardGrid stats={stats} />
}
