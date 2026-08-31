import {
  Box, Dialog, DialogTitle, DialogContent, IconButton, Divider, Stack,
  Typography, CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import { useCallLog } from '../hooks/useCallLogs'
import { useAdminContent } from '../../../i18n/useAdminContent'
import { PALETTE } from '../../../styles/palette'

type Props = {
  callId: string
  open: boolean
  onClose: () => void
}

export function TranscriptDialog({ callId, open, onClose }: Props) {
  const { data, isLoading } = useCallLog(callId)
  const { c } = useAdminContent()
  const t = c.transcript

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            bgcolor: PALETTE.shellPanel,
            border: `1px solid ${PALETTE.shellBorder}`,
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PhoneInTalkIcon sx={{ color: PALETTE.light, fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t.title}</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose} aria-label={t.close}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider sx={{ borderColor: PALETTE.shellBorder }} />

      <DialogContent sx={{ pt: 2 }}>
        {isLoading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>
        ) : null}
        {data ? (
          <Stack spacing={2}>
            <Box sx={{ p: 2, bgcolor: PALETTE.shellStat, borderRadius: 1.5, border: `1px solid ${PALETTE.shellBorder}` }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                {t.summary}
              </Typography>
              <Typography variant="body2">{data.summary || t.noSummary}</Typography>
            </Box>

            <Stack spacing={1}>
              {data.turns.map((turn, i) => (
                <Box key={i} sx={{ display: 'flex', justifyContent: turn.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
                  <Box
                    sx={{
                      maxWidth: '80%',
                      px: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      bgcolor: turn.role === 'assistant' ? 'rgba(124, 91, 156, 0.22)' : PALETTE.base,
                      color: turn.role === 'assistant' ? 'text.primary' : '#fff',
                    }}
                  >
                    <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.25 }}>
                      {turn.role === 'assistant' ? t.roleAssistant : t.roleDriver}
                    </Typography>
                    <Typography variant="body2">{turn.text}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>STT: {data.stt_provider || '—'}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>LLM: {data.llm_model || '—'}</Typography>
            </Box>
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
