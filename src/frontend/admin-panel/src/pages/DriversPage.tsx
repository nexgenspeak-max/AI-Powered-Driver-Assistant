import { Box, Card } from '@mui/material'
import { DriverStatCards } from '../features/drivers/components/DriverStatCards'
import { DriverTable } from '../features/drivers/components/DriverTable'
import { useDrivers } from '../features/drivers/hooks/useDrivers'

export default function DriversPage() {
  const { data: drivers = [], isLoading } = useDrivers()

  return (
    <Box>
      <DriverStatCards drivers={drivers} />
      <Card elevation={0} sx={{ borderRadius: 3 }}>
        <DriverTable drivers={drivers} loading={isLoading} />
      </Card>
    </Box>
  )
}
