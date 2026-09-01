import { useMemo, useState } from 'react'
import { Box, CardActionArea, CardContent, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import Badge from '../components/Badge'
import SurfaceCard from '../components/SurfaceCard'
import RouteLine from '../components/RouteLine'
import { useTripHistory } from '../features/trips/hooks/useTripHistory'
import { IN_PROGRESS_STATUSES, PENDING_STATUSES, TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../constants/status'
import { PALETTE } from '../styles/palette'
import type { Trip } from '../types'

type TripStatusTab = 'pending' | 'active' | 'completed'

const EMPTY_COPY: Record<TripStatusTab, string> = {
  pending: 'Không có chuyến nào đang chờ xác nhận.',
  active: 'Không có chuyến nào đang chạy.',
  completed: 'Chưa có chuyến nào hoàn thành.',
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function TripHistoryItem({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status]

  return (
    <SurfaceCard>
      <CardActionArea onClick={onPress} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="caption" sx={{ color: PALETTE.textSecondary }}>
              {formatDate(trip.created_at)}
            </Typography>
            <Badge
              label={TRIP_STATUS_LABELS[trip.status]}
              backgroundColor={statusColor.bg}
              color={statusColor.text}
            />
          </Stack>
          <RouteLine pickup={trip.pickup_address} dropoff={trip.dropoff_address} />
        </CardContent>
      </CardActionArea>
    </SurfaceCard>
  )
}

export default function TripsPage() {
  const navigate = useNavigate()
  const { data: trips, isLoading, isError } = useTripHistory()
  const [tab, setTab] = useState<TripStatusTab>('active')

  const grouped = useMemo(() => {
    const all = trips ?? []
    return {
      pending: all.filter(t => PENDING_STATUSES.includes(t.status)),
      active: all.filter(t => IN_PROGRESS_STATUSES.includes(t.status)),
      completed: all.filter(t => t.status === 'completed'),
    }
  }, [trips])

  const visibleTrips = grouped[tab]

  return (
    <AppShell maxWidth="md">
      <PageHeader
        title="Chuyến của tôi"
        subtitle="Theo dõi chuyến đang chờ, đang chạy và lịch sử hoàn thành."
      />

      <Tabs
        value={tab}
        onChange={(_, value: TripStatusTab) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: `1px solid ${PALETTE.border}`, mb: 3 }}
      >
        <Tab value="pending" label={`Chờ xác nhận (${grouped.pending.length})`} />
        <Tab value="active" label={`Đang chạy (${grouped.active.length})`} />
        <Tab value="completed" label={`Hoàn thành (${grouped.completed.length})`} />
      </Tabs>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: PALETTE.primary }} />
        </Box>
      ) : isError ? (
        <Typography variant="body1" sx={{ color: PALETTE.danger, textAlign: 'center', py: 4 }}>
          Không tải được lịch sử chuyến.
        </Typography>
      ) : visibleTrips.length === 0 ? (
        <Typography variant="body1" sx={{ color: PALETTE.textSecondary, textAlign: 'center', py: 6 }}>
          {trips && trips.length > 0 ? EMPTY_COPY[tab] : 'Bạn chưa có chuyến nào.'}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {visibleTrips.map(trip => (
            <TripHistoryItem
              key={trip.trip_id}
              trip={trip}
              onPress={() => navigate(`/trip/${trip.trip_id}`)}
            />
          ))}
        </Stack>
      )}
    </AppShell>
  )
}
