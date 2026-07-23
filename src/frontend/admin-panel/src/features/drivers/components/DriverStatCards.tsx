import LocalTaxiIcon from '@mui/icons-material/LocalTaxi'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import type { Driver } from '../../../types'
import { PALETTE } from '../../../styles/palette'
import { StatCardGrid } from '../../../components/StatCard'

type Props = { drivers: Driver[] }

export function DriverStatCards({ drivers }: Props) {
  const online  = drivers.filter(d => d.status === 'online').length
  const offline = drivers.length - online

  const stats = [
    { label: 'Total Drivers', value: drivers.length, color: PALETTE.base, icon: <LocalTaxiIcon fontSize="small" /> },
    { label: 'Online',        value: online,          color: '#4ade80', icon: <WifiIcon fontSize="small" /> },
    { label: 'Offline',       value: offline,         color: '#9ca3af', icon: <WifiOffIcon fontSize="small" /> },
  ]

  return <StatCardGrid stats={stats} />
}
