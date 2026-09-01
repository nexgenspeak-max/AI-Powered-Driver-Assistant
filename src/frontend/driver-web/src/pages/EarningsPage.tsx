import { useState } from 'react'
import { Box, CardContent, CircularProgress, Stack, Typography } from '@mui/material'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SegmentedControl from '../components/SegmentedControl'
import SurfaceCard from '../components/SurfaceCard'
import { useDriverContext } from '../features/dashboard/hooks/useDriverContext'
import { useEarningsSummary } from '../features/earnings/hooks/useEarningsSummary'
import { PALETTE } from '../styles/palette'
import type { Bonus, TodayEarnings } from '../types'

function formatCurrency(amount: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

function TodayEarningsCard({ earnings }: { earnings: TodayEarnings }) {
  return (
    <SurfaceCard>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="body2" sx={{ color: PALETTE.textSecondary, fontWeight: 600, mb: 1 }}>
          Thu nhập hôm nay
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: PALETTE.textPrimary, letterSpacing: '-0.02em' }}>
          {formatCurrency(earnings.total_earnings, earnings.currency)}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="caption" sx={{ color: PALETTE.textSecondary }}>
            {earnings.trip_count} chuyến
          </Typography>
          <Typography variant="caption" sx={{ color: PALETTE.textSecondary }}>
            {earnings.hours_online.toFixed(1)}h online
          </Typography>
          {earnings.bonus_earnings > 0 ? (
            <Typography variant="caption" sx={{ color: PALETTE.success, fontWeight: 600 }}>
              +{formatCurrency(earnings.bonus_earnings, earnings.currency)} thưởng
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </SurfaceCard>
  )
}

function BonusList({ bonuses }: { bonuses: Bonus[] }) {
  if (bonuses.length === 0) return null

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Thưởng đang áp dụng
      </Typography>
      {bonuses.map((bonus, i) => (
        <SurfaceCard
          key={i}
          sx={{
            bgcolor: PALETTE.warningContainer,
            borderColor: 'rgba(138, 90, 0, 0.2)',
          }}
        >
          <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#3D3319' }}>
                {bonus.description}
              </Typography>
              <Typography variant="caption" sx={{ color: '#7A6B45' }}>
                Hết hạn {bonus.expires_at}
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#8A5A00', flexShrink: 0 }}>
              {bonus.amount}
            </Typography>
          </CardContent>
        </SurfaceCard>
      ))}
    </Stack>
  )
}

export default function EarningsPage() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { data: context, isLoading: contextLoading, isError: contextError, refetch: refetchContext } = useDriverContext()
  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useEarningsSummary(period)

  return (
    <AppShell maxWidth="md">
      <PageHeader
        title="Thu nhập"
        subtitle="Theo dõi thu nhập hôm nay, tuần và tháng cùng các chương trình thưởng đang áp dụng."
      />

      <Stack spacing={3}>
        {contextLoading && !context ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: PALETTE.primary }} />
          </Box>
        ) : contextError && !context ? (
          <Typography
            variant="body2"
            sx={{ color: PALETTE.textSecondary, textAlign: 'center', py: 4, cursor: 'pointer' }}
            onClick={() => refetchContext()}
          >
            Không thể tải dữ liệu thu nhập hôm nay. Nhấn để thử lại.
          </Typography>
        ) : context ? (
          <TodayEarningsCard earnings={context.today_earnings} />
        ) : null}

        <SurfaceCard>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <SegmentedControl
              value={period}
              onChange={setPeriod}
              options={[
                { value: 'week', label: '7 ngày qua' },
                { value: 'month', label: '30 ngày qua' },
              ]}
            />
            {summaryError ? (
              <Typography
                variant="body2"
                sx={{ color: PALETTE.textSecondary, cursor: 'pointer' }}
                onClick={() => refetchSummary()}
              >
                Không thể tải dữ liệu. Nhấn để thử lại.
              </Typography>
            ) : summaryLoading || !summary ? (
              <CircularProgress size={24} sx={{ color: PALETTE.primary, alignSelf: 'flex-start' }} />
            ) : (
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: PALETTE.textPrimary }}>
                  {formatCurrency(summary.total_earnings, summary.currency)}
                </Typography>
                <Typography variant="caption" sx={{ color: PALETTE.textSecondary }}>
                  {summary.trip_count} chuyến hoàn thành
                </Typography>
              </Box>
            )}
          </CardContent>
        </SurfaceCard>

        {context && !contextError ? <BonusList bonuses={context.active_bonuses} /> : null}
      </Stack>
    </AppShell>
  )
}
