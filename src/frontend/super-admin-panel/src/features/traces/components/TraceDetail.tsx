import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Alert, Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material'
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import { ROUTES } from '../../../constants/routes'
import { groupTurns } from '../groupTurns'
import { sessionMetrics } from '../metrics'
import { buildInsights } from '../insights'
import { useTraceStream } from '../useTraceStream'
import { SessionHeader } from './SessionHeader'
import { InsightsPanel } from './InsightsPanel'
import { TraceTimeline } from './TraceTimeline'
import { OpsTable } from './OpsTable'

type TabId = 'timeline' | 'ops' | 'logs'

/** Everything about one session: header, improvement hints, and the three views. */
export function TraceDetail({ room }: { room: string }) {
  const { t } = useOpsLocale()
  const T = t.traces
  const [tab, setTab] = useState<TabId>('timeline')
  const { events, status } = useTraceStream(room)
  const session = useMemo(() => groupTurns(events), [events])
  const metrics = useMemo(() => sessionMetrics(session), [session])
  const insights = useMemo(() => buildInsights(metrics), [metrics])
  const startTs = session.start?.ts ?? events[0]?.ts
  const live = status === 'live' && !session.end

  return (
    <Stack spacing={2}>
      <SessionHeader room={room} session={session} metrics={metrics} status={status} />
      {status === 'missing' && <Alert severity="info">{T.notFound}</Alert>}
      {events.length > 0 && <InsightsPanel insights={insights} />}
      <Tabs value={tab} onChange={(_, v: TabId) => setTab(v)} sx={{ '& .MuiTab-root': { minHeight: 44 } }}>
        <Tab value="timeline" label={T.tabs.timeline} />
        <Tab value="ops" label={T.tabs.ops} />
        <Tab value="logs" label={T.tabs.logs} />
      </Tabs>
      {tab === 'timeline' && (
        <TraceTimeline turns={session.turns} startTs={startTs} live={live} eventCount={events.length} />
      )}
      {tab === 'ops' && <OpsTable events={session.events} startTs={startTs} />}
      {tab === 'logs' && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{T.logsHint}</Typography>
          <Button
            component={RouterLink}
            to={`${ROUTES.LOGS}?room=${encodeURIComponent(room)}`}
            variant="outlined"
            startIcon={<TerminalOutlinedIcon />}
            sx={{ minHeight: 44 }}
          >
            {T.openLogs}
          </Button>
        </Box>
      )}
    </Stack>
  )
}
