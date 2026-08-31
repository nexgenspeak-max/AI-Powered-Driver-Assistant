import { Box } from '@mui/material'
import { CustomerStatCards } from '../features/customers/components/CustomerStatCards'
import { CustomerTable } from '../features/customers/components/CustomerTable'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { useCustomers } from '../features/customers/hooks/useCustomers'

export default function CustomerPage() {
  const { data: customers = [], isLoading } = useCustomers()

  return (
    <Box>
      <CustomerStatCards customers={customers} />
      <SettingsPanel>
        <CustomerTable customers={customers} loading={isLoading} />
      </SettingsPanel>
    </Box>
  )
}
