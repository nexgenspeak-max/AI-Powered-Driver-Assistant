import { Box, Card } from '@mui/material'
import { CustomerStatCards } from '../features/customers/components/CustomerStatCards'
import { CustomerTable } from '../features/customers/components/CustomerTable'
import { useCustomers } from '../features/customers/hooks/useCustomers'

export default function CustomerPage() {
  const { data: customers = [], isLoading } = useCustomers()

  return (
    <Box>
      <CustomerStatCards customers={customers} />
      <Card elevation={0} sx={{ borderRadius: 3 }}>
        <CustomerTable customers={customers} loading={isLoading} />
      </Card>
    </Box>
  )
}
