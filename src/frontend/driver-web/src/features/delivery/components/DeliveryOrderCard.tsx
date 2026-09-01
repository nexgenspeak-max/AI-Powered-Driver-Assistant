import { Button, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Badge from '../../../components/Badge'
import SurfaceCard from '../../../components/SurfaceCard'
import { DELIVERY_ORDER_STATUS_COLORS, DELIVERY_ORDER_STATUS_LABELS } from '../../../constants/status'
import { deliveryOrdersService } from '../../../services/api/deliveryOrders'
import { PALETTE } from '../../../styles/palette'
import type { DeliveryOrder, DeliveryOrderStatus } from '../../../types'
import { useState } from 'react'

const NEXT: Partial<Record<DeliveryOrderStatus, { label: string; target: DeliveryOrderStatus }>> = {
  pending: { label: 'Đã lấy hàng', target: 'picked_up' },
  picked_up: { label: 'Bắt đầu giao hàng', target: 'delivering' },
  delivering: { label: 'Giao thành công', target: 'delivered' },
  redelivery: { label: 'Giao lại', target: 'delivering' },
}

const SECONDARY: Partial<Record<DeliveryOrderStatus, { label: string; target: DeliveryOrderStatus }>> = {
  delivering: { label: 'Không giao được, giao lại', target: 'redelivery' },
  redelivery: { label: 'Trả hàng', target: 'returned' },
}

export default function DeliveryOrderCard({ order }: { order: DeliveryOrder }) {
  const qc = useQueryClient()
  const [confirmReturn, setConfirmReturn] = useState(false)
  const { mutate: setStatus, isPending } = useMutation({
    mutationFn: (status: DeliveryOrderStatus) => deliveryOrdersService.updateStatus(order.order_id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliveryOrders'] }),
  })

  const primary = NEXT[order.status]
  const secondary = SECONDARY[order.status]
  const statusColor = DELIVERY_ORDER_STATUS_COLORS[order.status]

  return (
    <>
      <SurfaceCard>
        <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Stack sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: PALETTE.primaryMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Inventory2OutlinedIcon sx={{ color: PALETTE.primary }} />
            </Stack>
            <Stack sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }} noWrap>{order.recipient_phone}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{order.recipient_address}</Typography>
            </Stack>
            <Badge label={DELIVERY_ORDER_STATUS_LABELS[order.status]} backgroundColor={statusColor.bg} color={statusColor.text} />
          </Stack>

          <Typography variant="body2"><strong>Người gửi:</strong> {order.sender_phone}</Typography>

          {primary ? (
            <Button fullWidth variant="contained" disabled={isPending} onClick={() => setStatus(primary.target)}
              sx={{ background: `linear-gradient(135deg, ${PALETTE.gradientStart}, ${PALETTE.gradientEnd})` }}>
              {primary.label}
            </Button>
          ) : null}

          {secondary ? (
            <Button fullWidth variant="text" color="error" disabled={isPending} onClick={() => {
              if (secondary.target === 'returned') setConfirmReturn(true)
              else setStatus(secondary.target)
            }}>
              {secondary.label}
            </Button>
          ) : null}
        </CardContent>
      </SurfaceCard>

      <Dialog open={confirmReturn} onClose={() => setConfirmReturn(false)}>
        <DialogTitle>Trả hàng?</DialogTitle>
        <DialogContent><Typography variant="body2">Đơn sẽ được đánh dấu đã trả lại, không thể hoàn tác.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReturn(false)}>Huỷ</Button>
          <Button color="error" onClick={() => { setStatus('returned'); setConfirmReturn(false) }}>Trả hàng</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
