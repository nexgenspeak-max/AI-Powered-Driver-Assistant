import LocalTaxiIcon from '@mui/icons-material/LocalTaxi'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import type { Driver } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { StatCardGrid } from '../../../components/StatCard'
import { useAdminContent } from '../../../i18n/useAdminContent'

type Props = { drivers: Driver[] }

export function DriverStatCards({ drivers }: Props) {
  const { c } = useAdminContent()
  const online  = drivers.filter(d => d.status === 'online').length
  const offline = drivers.length - online

  const stats = [
    { label: c.stats.totalDrivers, value: drivers.length, color: PALETTE.light, icon: <LocalTaxiIcon fontSize="small" /> },
    { label: c.common.online,      value: online,          color: PALETTE.success, icon: <WifiIcon fontSize="small" /> },
    { label: c.common.offline,     value: offline,         color: PALETTE.shellMuted, icon: <WifiOffIcon fontSize="small" /> },
  ]

  return <StatCardGrid stats={stats} />
}
