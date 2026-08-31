import { Box } from '@mui/material'
import { DriverStatCards } from '../features/drivers/components/DriverStatCards'
import { DriverTable } from '../features/drivers/components/DriverTable'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { useDrivers } from '../features/drivers/hooks/useDrivers'

export default function DriversPage() {
  const { data: drivers = [], isLoading } = useDrivers()

  return (
    <Box>
      <DriverStatCards drivers={drivers} />
      <SettingsPanel>
        <DriverTable drivers={drivers} loading={isLoading} />
      </SettingsPanel>
    </Box>
  )
}
