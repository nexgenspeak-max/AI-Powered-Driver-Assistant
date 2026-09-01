import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew'
import { Box, Typography } from '@mui/material'
import SurfaceCard from '../../../components/SurfaceCard'
import { PALETTE } from '../../../styles/palette'

export default function EmptyTripsState({ isOnline }: { isOnline: boolean }) {
  return (
    <SurfaceCard sx={{ textAlign: 'center', py: 5, px: 3 }}>
      <Box
        sx={{
          width: 64, height: 64, borderRadius: '18px',
          bgcolor: PALETTE.chipBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          mx: 'auto', mb: 2, color: PALETTE.primary,
        }}
      >
        {isOnline ? <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 32 }} /> : <PowerSettingsNewIcon sx={{ fontSize: 32 }} />}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: PALETTE.textPrimary }}>
        {isOnline ? 'Chưa có chuyến nào' : 'Bạn đang offline'}
      </Typography>
      <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mt: 0.75 }}>
        {isOnline ? 'Đang chờ chuyến mới được giao...' : 'Bật "Đang bật" để bắt đầu nhận chuyến'}
      </Typography>
    </SurfaceCard>
  )
}
