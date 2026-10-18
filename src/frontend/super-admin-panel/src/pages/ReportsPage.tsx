import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import SpeedOutlinedIcon from '@mui/icons-material/SpeedOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import { isAxiosError } from 'axios'
import { opsService } from '../services/api/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { PALETTE } from '../styles/palette'
import { StatCardGrid } from '../components/StatCard'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { SettingsRow } from '../layouts/SettingsRow'
import type { DailyReport } from '../types/ops'

const VN_OFFSET_MS = 7 * 3600 * 1000

/** Vietnam calendar day, offset in days from today (reports are keyed by Vietnam date). */
function vnDate(offsetDays: number): string {
  return new Date(Date.now() + VN_OFFSET_MS + offsetDays * 86400000).toISOString().slice(0, 10)
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '–' : `${(v * 100).toFixed(1)}%`)
const secs = (ms: number | null | undefined) => (ms === null || ms === undefined ? '–' : `${(ms / 1000).toFixed(2)} s`)

export default function ReportsPage() {
  const { t } = useOpsLocale()
  const r = t.reports
  const queryClient = useQueryClient()
  // ?date=YYYY-MM-DD deep-links a given day; default is yesterday (Vietnam time).
  const [date, setDate] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('date')
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : vnDate(-1)
  })

  const reportQ = useQuery({
    queryKey: ['ops-report', date],
    queryFn: () => opsService.dailyReport(date),
    retry: false,
  })
  const trendQ = useQuery({
    queryKey: ['ops-report-trend', date],
    queryFn: () => {
      const end = new Date(`${date}T00:00:00Z`)
      const start = new Date(end.getTime() - 6 * 86400000).toISOString().slice(0, 10)
      return opsService.dailyReports(start, date)
    },
  })
  const rebuild = useMutation({
    mutationFn: () => opsService.rebuildDailyReport(date),
    onSuccess: data => {
      queryClient.setQueryData(['ops-report', date], data)
      void queryClient.invalidateQueries({ queryKey: ['ops-report-trend'] })
    },
  })

  const notFound = isAxiosError(reportQ.error) && reportQ.error.response?.status === 404
  const report: DailyReport | undefined = reportQ.data
  const judged = report?.accuracy.judged ?? null

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, alignItems: { sm: 'center' } }}>
        <TextField
          type="date"
          label={r.date}
          value={date}
          onChange={e => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: vnDate(0) } }}
          size="small"
        />
        <Button
          variant="outlined"
          onClick={() => rebuild.mutate()}
          disabled={rebuild.isPending}
          sx={{ minHeight: 40 }}
        >
          {rebuild.isPending ? r.rebuilding : r.rebuild}
        </Button>
        {report ? (
          <Typography variant="caption" color="text.secondary">
            {r.generatedAt}: {new Date(report.generated_at).toLocaleString()}
          </Typography>
        ) : null}
      </Stack>

      {notFound ? <Alert severity="info" sx={{ mb: 2 }}>{r.missing(date)}</Alert> : null}
      {reportQ.error && !notFound ? <Alert severity="error" sx={{ mb: 2 }}>{r.loadFailed}</Alert> : null}
      {rebuild.error ? <Alert severity="error" sx={{ mb: 2 }}>{String(rebuild.error)}</Alert> : null}

      {report ? (
        <>
          <StatCardGrid
            stats={[
              { label: r.sessions, value: report.activity.sessions, color: PALETTE.info, icon: <ForumOutlinedIcon fontSize="small" /> },
              { label: r.drivers, value: report.activity.drivers_served, color: PALETTE.success, icon: <GroupsOutlinedIcon fontSize="small" /> },
              { label: r.toolSuccess, value: pct(report.accuracy.tool_success_rate), color: PALETTE.mid, icon: <TaskAltOutlinedIcon fontSize="small" /> },
              {
                label: r.correctRate,
                value: judged ? pct(judged.correct_rate) : r.notJudged,
                color: PALETTE.success,
                icon: <FactCheckOutlinedIcon fontSize="small" />,
              },
              { label: r.latencyMean, value: secs(report.latency_ms.mean), color: PALETTE.light, icon: <TimerOutlinedIcon fontSize="small" /> },
              { label: r.latencyP95, value: secs(report.latency_ms.p95), color: PALETTE.light, icon: <SpeedOutlinedIcon fontSize="small" /> },
              { label: r.errors, value: report.errors.total, color: PALETTE.danger, icon: <ErrorOutlineOutlinedIcon fontSize="small" /> },
            ]}
          />

          <SettingsPanel>
            <SettingsRow label={r.customers} value={report.activity.customers_served} />
            <SettingsRow label={r.customerCalls} value={report.activity.customer_calls} />
            <SettingsRow label={r.turns} value={report.activity.turns} />
            <SettingsRow label={r.avgSession} value={report.activity.avg_session_s === null ? '–' : `${report.activity.avg_session_s} s`} />
            <SettingsRow
              label={r.byMode}
              value={
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(report.activity.sessions_by_mode).map(([mode, n]) => (
                    <Chip key={mode} size="small" label={`${mode}: ${n}`} />
                  ))}
                </Stack>
              }
            />
            <SettingsRow label={r.slowRatio} value={pct(report.latency_ms.slow_ratio)} />
            <SettingsRow
              label={r.meetsNfr}
              value={
                report.latency_ms.meets_nfr02 === null ? '–' : (
                  <Chip size="small" color={report.latency_ms.meets_nfr02 ? 'success' : 'warning'}
                    label={report.latency_ms.meets_nfr02 ? r.yes : r.no} />
                )
              }
            />
            <SettingsRow label={r.fillers} value={`${report.fillers.count} (${pct(report.fillers.per_turn)})`} />
            <SettingsRow label={r.httpErrorRate} value={pct(report.accuracy.http_error_rate)} />
            <SettingsRow label={r.sessionsWithErrors} value={report.errors.sessions_with_errors} />
            <SettingsRow
              label={r.topHttp}
              value={report.errors.top_http.length
                ? report.errors.top_http.map(e => `${e.key} ×${e.count}`).join(' · ')
                : r.none}
            />
            <SettingsRow
              label={r.fallbacks}
              value={report.fallbacks.total
                ? Object.entries(report.fallbacks.by_provider).map(([k, v]) => `${k} ×${v}`).join(' · ')
                : r.none}
            />
            <SettingsRow
              label={r.correctRate}
              hint={judged?.method}
              value={judged
                ? r.judgeMethod(judged.model, judged.sample_size, judged.correct, judged.incorrect, judged.unclear)
                : r.notJudged}
            />
            <SettingsRow
              label={r.notes}
              hint={r.coverage(report.coverage.with_metrics, report.coverage.records)}
              value={report.coverage.notes.length ? report.coverage.notes.join(' ') : r.none}
            />
          </SettingsPanel>

          {judged?.examples_incorrect.length ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{r.incorrectExamples}</Typography>
              <SettingsPanel>
                {judged.examples_incorrect.map(x => (
                  <SettingsRow key={`${x.call_id}-${x.user}`} label={x.user} hint={x.reason} value={x.assistant} />
                ))}
              </SettingsPanel>
            </Box>
          ) : null}
        </>
      ) : null}

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>{r.trend}</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{r.date}</TableCell>
              <TableCell align="right">{r.sessions}</TableCell>
              <TableCell align="right">{r.drivers}</TableCell>
              <TableCell align="right">{r.latencyMean}</TableCell>
              <TableCell align="right">{r.latencyP95}</TableCell>
              <TableCell align="right">{r.correctRate}</TableCell>
              <TableCell align="right">{r.errors}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(trendQ.data ?? []).map(d => (
              <TableRow key={d.report_date} hover selected={d.report_date === date}
                onClick={() => setDate(d.report_date)} sx={{ cursor: 'pointer' }}>
                <TableCell>{d.report_date}</TableCell>
                <TableCell align="right">{d.activity.sessions}</TableCell>
                <TableCell align="right">{d.activity.drivers_served}</TableCell>
                <TableCell align="right">{secs(d.latency_ms.mean)}</TableCell>
                <TableCell align="right">{secs(d.latency_ms.p95)}</TableCell>
                <TableCell align="right">{d.accuracy.judged ? pct(d.accuracy.judged.correct_rate) : '–'}</TableCell>
                <TableCell align="right">{d.errors.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
