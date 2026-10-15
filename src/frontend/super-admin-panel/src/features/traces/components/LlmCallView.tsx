import { useState } from 'react'
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { LlmCall } from '../groupTurns'
import { LLM_TTFT_SLOW_MS } from '../insights'
import { fmtMs } from '../format'
import { JsonBlock } from './JsonBlock'
import { PromptMessages } from './PromptMessages'

const COPIED_MS = 1500

function promptJson(call: LlmCall): string {
  const r = call.request
  return JSON.stringify(
    { model: r?.model, tool_choice: r?.tool_choice ?? null, messages: r?.messages ?? [], tools: r?.tools ?? [] },
    null,
    2,
  )
}

export function LlmCallView({ call, number }: { call: LlmCall; number: number }) {
  const { t } = useOpsLocale()
  const T = t.traces
  const [promptOpen, setPromptOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { request, response, metrics } = call
  const ttft = response?.ttft_ms ?? metrics?.ttft_ms ?? null
  const duration = response?.duration_ms ?? metrics?.duration_ms ?? null
  const slow = ttft !== null && ttft > LLM_TTFT_SLOW_MS

  const copy = () => {
    void navigator.clipboard.writeText(promptJson(call)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_MS)
    })
  }

  return (
    <Box sx={{ border: `1px solid ${PALETTE.shellBorder}`, borderRadius: 2, p: 1.5, bgcolor: PALETTE.shellStat }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{T.llmCall(call.call ?? number)}</Typography>
        {request?.model && <Chip size="small" label={request.model} variant="outlined" />}
        {metrics && (
          <Typography variant="caption" color="text.secondary">
            {T.tokensInOut(metrics.prompt_tokens ?? '—', metrics.completion_tokens ?? '—')}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: slow ? PALETTE.danger : 'text.secondary', fontWeight: slow ? 700 : 400 }}>
          {T.ttft} {fmtMs(ttft)}
        </Typography>
        <Typography variant="caption" color="text.secondary">{T.callDuration} {fmtMs(duration)}</Typography>
        <Box sx={{ flex: 1 }} />
        {request && (
          <Button size="small" startIcon={<ContentCopyIcon fontSize="small" />} onClick={copy} sx={{ minHeight: 44 }}>
            {copied ? T.copied : T.copyPrompt}
          </Button>
        )}
      </Stack>

      {request && (
        <Box sx={{ mt: 0.5 }}>
          <Button
            size="small"
            onClick={() => setPromptOpen(o => !o)}
            aria-expanded={promptOpen}
            endIcon={promptOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ minHeight: 44, color: 'text.primary' }}
          >
            {T.prompt} ({request.messages?.length ?? 0})
          </Button>
          {promptOpen && (
            <Box sx={{ mt: 1, pl: 1 }}>
              <PromptMessages request={request} sameSystemAsPrevious={call.sameSystemAsPrevious} />
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{T.response}</Typography>
        {!response ? (
          <Typography variant="body2" color="text.secondary">{T.noResponse}</Typography>
        ) : (
          <Stack spacing={1}>
            {response.error && <Alert severity="error">{response.error}</Alert>}
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: response.text ? 'text.primary' : 'text.secondary' }}>
              {response.text || T.noResponseText}
            </Typography>
            {(response.tool_calls ?? []).map((tc, i) => (
              <Box key={tc.call_id || i}>
                <Typography variant="caption" sx={{ color: PALETTE.warning, fontWeight: 700 }}>
                  {T.toolCalls}: {tc.name}
                </Typography>
                <JsonBlock value={tc.arguments} maxHeight={240} />
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  )
}
