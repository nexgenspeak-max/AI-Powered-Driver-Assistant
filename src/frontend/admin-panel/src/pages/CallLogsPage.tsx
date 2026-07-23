import { useState } from 'react'
import { Box } from '@mui/material'
import { useCallLogs } from '../features/call-logs/hooks/useCallLogs'
import { CallLogsTable } from '../features/call-logs/components/CallLogsTable'
import { TranscriptDialog } from '../features/call-logs/components/TranscriptDialog'

export default function CallLogsPage() {
  const [callerFilter, setCallerFilter] = useState('')
  const [selectedCallId, setSelectedCallId] = useState('')

  const { data: logs = [], isLoading } = useCallLogs(callerFilter || undefined)

  return (
    <Box>
      <CallLogsTable
        logs={logs}
        loading={isLoading}
        callerFilter={callerFilter}
        onCallerFilterChange={setCallerFilter}
        onSelectCall={setSelectedCallId}
      />

      <TranscriptDialog
        callId={selectedCallId}
        open={!!selectedCallId}
        onClose={() => setSelectedCallId('')}
      />
    </Box>
  )
}
