import { Typography } from '@mui/material'
import SurfaceCard from '../../../components/SurfaceCard'
import { PALETTE } from '../../../styles/palette'

export default function EmptyDeliveryState() {
  return (
    <SurfaceCard sx={{ textAlign: 'center', py: 5, px: 3 }}>
      <Typography variant="body1" sx={{ color: PALETTE.textSecondary }}>
        Chưa có đơn giao hàng. Tạo đơn mới từ nút &quot;Thêm đơn giao hàng&quot;.
      </Typography>
    </SurfaceCard>
  )
}
