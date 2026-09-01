import { useMemo, useState } from 'react'
import { Box, Button, InputAdornment, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import SearchIcon from '@mui/icons-material/Search'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import TripCard from '../features/dashboard/components/TripCard'
import ActiveTripCard from '../features/dashboard/components/ActiveTripCard'
import EmptyTripsState from '../features/dashboard/components/EmptyTripsState'
import DeliveryOrderCard from '../features/delivery/components/DeliveryOrderCard'
import EmptyDeliveryState from '../features/delivery/components/EmptyDeliveryState'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useDriverContext } from '../features/dashboard/hooks/useDriverContext'
import { useDeliveryOrders } from '../features/delivery/hooks/useDeliveryOrders'
import { driversService } from '../services/api/drivers'
import { DELIVERY_ACTIVE_STATUSES, PENDING_STATUSES } from '../constants/status'
import { PALETTE } from '../styles/palette'
import type { TripWithFare } from '../types'

type DashboardMode = 'trips' | 'delivery'
type TripStatusTab = 'pending' | 'active' | 'completed'
type DeliveryTab = 'active' | 'delivered'

export default function DashboardPage() {
  const qc = useQueryClient()
  const { data: driver } = useCurrentUser()
  const { data: context, isLoading } = useDriverContext()
  const { data: deliveryOrders = [], isLoading: deliveryLoading } = useDeliveryOrders()
  const [mode, setMode] = useState<DashboardMode>('trips')
  const [tab, setTab] = useState<TripStatusTab>('active')
  const [deliveryTab, setDeliveryTab] = useState<DeliveryTab>('active')
  const [query, setQuery] = useState('')

  const isOnline = driver?.status === 'online'

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver!.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => {
      qc.setQueryData(['me'], d)
      qc.invalidateQueries({ queryKey: ['driverContext'] })
    },
  })

  const pending = (context?.upcoming_trips ?? []).filter(t => PENDING_STATUSES.includes(t.status))
  const active = context?.active_trips ?? []
  const completed = context?.completed_trips ?? []

  const deliveryGrouped = useMemo(() => ({
    active: deliveryOrders.filter(o => DELIVERY_ACTIVE_STATUSES.includes(o.status)),
    delivered: deliveryOrders.filter(o => o.status === 'delivered'),
  }), [deliveryOrders])

  const matchesQuery = (t: TripWithFare) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return t.customer_name?.toLowerCase().includes(q) || t.customer_phone?.toLowerCase().includes(q)
  }

  const trips =
    tab === 'pending' ? pending.filter(matchesQuery)
      : tab === 'active' ? active.filter(matchesQuery)
        : completed.filter(matchesQuery)

  const visibleDelivery = deliveryGrouped[deliveryTab]

  if (!driver) return null

  return (
    <AppShell maxWidth="lg">
      <PageHeader
        title={mode === 'trips' ? 'Chuyến đi' : 'Giao hàng'}
        subtitle={mode === 'trips'
          ? 'Theo dõi yêu cầu mới, chuyến đang chạy và lịch sử hoàn thành.'
          : 'Quản lý đơn giao hàng đang xử lý và đã giao.'}
        action={mode === 'trips' ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: isOnline ? PALETTE.success : PALETTE.textMuted, fontWeight: 600 }}>
              {isOnline ? 'Sẵn sàng nhận chuyến' : 'Đang tắt'}
            </Typography>
            <Switch
              checked={isOnline}
              onChange={(_, checked) => toggleOnline(checked)}
              slotProps={{ input: { 'aria-label': 'Trạng thái sẵn sàng nhận chuyến' } }}
            />
          </Stack>
        ) : (
          <Button component={RouterLink} to="/add-delivery" variant="contained" size="small"
            sx={{ background: `linear-gradient(135deg, ${PALETTE.gradientStart}, ${PALETTE.gradientEnd})` }}>
            Thêm đơn
          </Button>
        )}
      />

      <Stack spacing={3}>
        <Tabs value={mode} onChange={(_, v: DashboardMode) => setMode(v)} sx={{ borderBottom: `1px solid ${PALETTE.border}` }}>
          <Tab value="trips" label="Chuyến xe" />
          <Tab value="delivery" label="Giao hàng" />
        </Tabs>

        {mode === 'trips' ? (
          <>
            <TextField
              placeholder="Tìm theo tên hoặc số điện thoại..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: PALETTE.textMuted }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Tabs value={tab} onChange={(_, value: TripStatusTab) => setTab(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="pending" label={`Chờ xác nhận (${pending.length})`} />
              <Tab value="active" label={`Đang chạy (${active.length})`} />
              <Tab value="completed" label={`Hoàn thành (${completed.length})`} />
            </Tabs>
            {isLoading && !context ? (
              <Typography sx={{ textAlign: 'center', py: 4, color: PALETTE.textMuted }}>Đang tải...</Typography>
            ) : trips.length === 0 ? (
              tab === 'completed' && completed.length > 0 ? (
                <Typography variant="body1" sx={{ color: PALETTE.textSecondary, textAlign: 'center', py: 4 }}>
                  Không tìm thấy chuyến đi phù hợp
                </Typography>
              ) : tab === 'completed' ? (
                <Typography variant="body1" sx={{ color: PALETTE.textSecondary, textAlign: 'center', py: 4 }}>
                  Chưa có chuyến nào hoàn thành
                </Typography>
              ) : (
                <EmptyTripsState isOnline={isOnline} />
              )
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {trips.map(trip =>
                  tab === 'active' ? (
                    <ActiveTripCard key={trip.trip_id} trip={trip} />
                  ) : (
                    <TripCard key={trip.trip_id} trip={trip} />
                  ),
                )}
              </Box>
            )}
          </>
        ) : (
          <>
            <Tabs value={deliveryTab} onChange={(_, v: DeliveryTab) => setDeliveryTab(v)}>
              <Tab value="active" label={`Đang giao (${deliveryGrouped.active.length})`} />
              <Tab value="delivered" label={`Đã giao (${deliveryGrouped.delivered.length})`} />
            </Tabs>
            {deliveryLoading ? (
              <Typography sx={{ textAlign: 'center', py: 4, color: PALETTE.textMuted }}>Đang tải...</Typography>
            ) : visibleDelivery.length === 0 ? (
              <EmptyDeliveryState />
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {visibleDelivery.map(order => <DeliveryOrderCard key={order.order_id} order={order} />)}
              </Box>
            )}
          </>
        )}
      </Stack>
    </AppShell>
  )
}
