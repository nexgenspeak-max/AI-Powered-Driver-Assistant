import {
  Box, Button, Dialog, DialogTitle, DialogContent, IconButton, Divider, Stack, Typography, CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useQuery } from '@tanstack/react-query'
import { opsService } from '../../services/api/ops'
import { PALETTE } from '../../styles/palette'
import { useOpsLocale } from '../../i18n/useOpsLocale'

type Props = {
  callId: string
  open: boolean
  onClose: () => void
}

export function TranscriptDialog({ callId, open, onClose }: Props) {
  const { t } = useOpsLocale()
  const { data, isLoading } = useQuery({
    queryKey: ['ops-record', callId],
    queryFn: () => opsService.getRecord(callId),
    enabled: open && !!callId,
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t.calls.transcript}</Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          component={RouterLink}
          to={`${ROUTES.TRACES}?room=${encodeURIComponent(callId)}`}
          size="small"
          startIcon={<ForumOutlinedIcon fontSize="small" />}
          sx={{ minHeight: 44, mr: 1 }}
        >
          {t.calls.viewDetails}
        </Button>
        <IconButton aria-label={t.calls.close} onClick={onClose} sx={{ width: 44, height: 44 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 2 }}>
        {isLoading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>}
        {data && (
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: PALETTE.darkest, borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                {t.calls.summary}
              </Typography>
              <Typography variant="body2">{data.summary || t.calls.noSummary}</Typography>
            </Box>
            <Stack spacing={1}>
              {data.turns.map((turn, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: turn.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
                  <Box sx={{
                    maxWidth: '80%', px: 1.5, py: 1, borderRadius: 2,
                    bgcolor: turn.role === 'assistant' ? PALETTE.base : PALETTE.mid,
                    color: PALETTE.pale,
                  }}>
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.25 }}>
                      {turn.role === 'assistant' ? t.calls.assistant : t.calls.callerTurn}
                    </Typography>
                    <Typography variant="body2">{turn.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
