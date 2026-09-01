import { Box, Chip, IconButton, Tooltip } from '@mui/material'
import CallEndIcon from '@mui/icons-material/CallEnd'
import { Link as RouterLink } from 'react-router-dom'
import { useVoiceSessionStore } from '../features/home/stores/voiceSessionStore'

const LABEL: Record<'connecting' | 'connected' | 'error', string> = {
  connecting: 'Đang kết nối với AI...',
  connected: 'Đang trong phiên thoại với AI',
  error: 'Kết nối AI bị lỗi',
}

/**
 * Persists outside <Routes> so an in-progress voice session stays visible
 * (and endable) even after navigating away from the home page, instead of
 * silently continuing in the background with no UI trace.
 */
export default function VoiceSessionWidget() {
  const status = useVoiceSessionStore(s => s.status)
  const disconnect = useVoiceSessionStore(s => s.disconnect)

  if (status === 'idle') return null

  return (
    <Box sx={{
      position: 'fixed', top: 12, right: 12, zIndex: 2000,
      display: 'flex', alignItems: 'center', gap: 0.5,
      bgcolor: 'rgba(20,20,20,0.9)', borderRadius: 999, pl: 1.5, pr: 0.5, py: 0.5, boxShadow: 3,
    }}>
      <Chip
        component={RouterLink}
        to="/"
        label={LABEL[status]}
        clickable
        size="small"
        sx={{ bgcolor: 'transparent', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
      />
      <Tooltip title="Kết thúc cuộc gọi">
        <IconButton size="small" onClick={() => disconnect({ userInitiated: true })} sx={{ color: '#e05252' }}>
          <CallEndIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
