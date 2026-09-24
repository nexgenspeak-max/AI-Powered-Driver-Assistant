import { useState } from 'react'
import { Box, InputAdornment, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import SearchIcon from '@mui/icons-material/Search'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import TripCard from '../features/dashboard/components/TripCard'
import ActiveTripCard from '../features/dashboard/components/ActiveTripCard'
import EmptyTripsState from '../features/dashboard/components/EmptyTripsState'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { useDriverContext } from '../features/dashboard/hooks/useDriverContext'
import { driversService } from '../services/api/drivers'
import { PENDING_STATUSES } from '../constants/status'
import { PALETTE } from '../styles/palette'
import type { TripWithFare } from '../types'

type TripStatusTab = 'pending' | 'active' | 'completed'

export default function DashboardPage() {
  const qc = useQueryClient()
  const { data: driver } = useCurrentUser()
  const { data: context, isLoading } = useDriverContext()
  const [tab, setTab] = useState<TripStatusTab>('active')
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

  const matchesQuery = (t: TripWithFare) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return t.customer_name?.toLowerCase().includes(q) || t.customer_phone?.toLowerCase().includes(q)
  }

  const trips =
    tab === 'pending' ? pending.filter(matchesQuery)
      : tab === 'active' ? active.filter(matchesQuery)
        : completed.filter(matchesQuery)

  if (!driver) return null

  return (
    <AppShell maxWidth="lg">
      <PageHeader
        title="Chuyến đi"
        subtitle="Theo dõi yêu cầu mới, chuyến đang chạy và lịch sử hoàn thành."
        action={(
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
        )}
      />

      <Stack spacing={3}>
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
      </Stack>
    </AppShell>
  )
}
