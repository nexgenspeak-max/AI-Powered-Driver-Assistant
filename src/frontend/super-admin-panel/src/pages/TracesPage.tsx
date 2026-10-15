import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Box, Paper, Typography } from '@mui/material'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { PALETTE } from '../styles/palette'
import { useTraceSessions } from '../features/traces/useTraceSessions'
import { TraceSessionList } from '../features/traces/components/TraceSessionList'
import { TraceDetail } from '../features/traces/components/TraceDetail'

export default function TracesPage() {
  const { t } = useOpsLocale()
  const T = t.traces
  const [params, setParams] = useSearchParams()
  const room = params.get('room')
  const [mode, setMode] = useState('')
  const { data, error, dataUpdatedAt } = useTraceSessions(mode)

  const select = (next: string) => setParams({ room: next })

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '340px minmax(0, 1fr)' }, alignItems: 'start' }}>
      <Paper variant="outlined" sx={{ p: 2, bgcolor: PALETTE.shellPanel, borderColor: PALETTE.shellBorder }}>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{T.loadFailed}</Alert> : null}
        <TraceSessionList
          sessions={data ?? []}
          now={dataUpdatedAt}
          selected={room}
          onSelect={select}
          mode={mode}
          onModeChange={setMode}
        />
      </Paper>
      <Box sx={{ minWidth: 0 }}>
        {room ? (
          <TraceDetail key={room} room={room} />
        ) : (
          <Typography color="text.secondary" sx={{ p: 2 }}>{T.selectSession}</Typography>
        )}
      </Box>
    </Box>
  )
}
