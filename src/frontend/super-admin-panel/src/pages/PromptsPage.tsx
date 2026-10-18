import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Stack, TextField, Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useLocation } from 'react-router-dom'
import { opsService } from '../services/api/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { PALETTE } from '../styles/palette'
import { VoiceBrowseTrail } from '../layouts/VoiceBrowseTrail'
import { readVoiceQuery } from '../layouts/voiceQuery'

const REFETCH_MS = 12_000

export default function PromptsPage() {
  const { t } = useOpsLocale()
  const { search } = useLocation()
  const browse = readVoiceQuery(search)
  const [q, setQ] = useState('')
  const { data, error } = useQuery({
    queryKey: ['ops-prompts'],
    queryFn: opsService.prompts,
    refetchInterval: REFETCH_MS,
  })

  const files = useMemo(() => {
    const list = (data?.prompts ?? []).filter(row => {
      if (browse.lang && row.locale !== browse.lang) {
        return false
      }
      if (browse.file && row.path !== browse.file) {
        return false
      }
      return true
    })
    const needle = q.trim().toLowerCase()
    if (!needle) {
      return list
    }
    return list.filter(row => row.path.toLowerCase().includes(needle) || row.locale.toLowerCase().includes(needle))
  }, [data?.prompts, q, browse.lang, browse.file])

  if (error) {
    return <Alert severity="error">{t.agent.empty}</Alert>
  }
  if (!data) {
    return null
  }

  return (
    <Stack spacing={2}>
      <VoiceBrowseTrail feature={t.nav.prompts.label} />
      <Typography variant="body2" color="text.secondary">
        {t.prompts.liveHint}
      </Typography>
      <TextField
        size="small"
        fullWidth
        label={t.prompts.search}
        value={q}
        onChange={e => setQ(e.target.value)}
      />
      {files.length === 0 ? (
        <Alert severity="info">{t.prompts.empty}</Alert>
      ) : (
        files.map(row => (
          <Accordion
            key={row.path}
            defaultExpanded={Boolean(browse.file) || files.length === 1}
            disableGutters
            sx={{
              bgcolor: PALETTE.shellPanel,
              border: `1px solid ${PALETTE.shellBorder}`,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 52 }}>
              <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
                  {row.path}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip size="small" label={row.locale} />
                  <Typography variant="caption" color="text.secondary">
                    {t.prompts.bytes(row.bytes)} · {row.mtime}
                  </Typography>
                </Stack>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  maxHeight: 480,
                  overflow: 'auto',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  bgcolor: PALETTE.codeBg,
                  borderRadius: 1,
                  color: PALETTE.pale,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {row.text}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Stack>
  )
}
