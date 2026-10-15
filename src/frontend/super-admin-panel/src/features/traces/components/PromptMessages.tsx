import { useState, type ReactNode } from 'react'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { ChatItem, LlmRequestEvent } from '../types'
import { isSystemItem } from '../groupTurns'
import { JsonBlock } from './JsonBlock'

const ROLE_COLOR: Record<string, string> = {
  user: PALETTE.info,
  assistant: PALETTE.light,
  system: PALETTE.warning,
  developer: PALETTE.warning,
  function_call: PALETTE.warning,
  function_call_output: PALETTE.success,
}

function roleKey(item: ChatItem): string {
  return item.type === 'message' ? item.role ?? 'message' : item.type
}

function HistoryItem({ item }: { item: ChatItem }) {
  const { t } = useOpsLocale()
  const key = roleKey(item)
  const label = t.traces.roles[key as keyof typeof t.traces.roles] ?? key
  const isCall = item.type !== 'message'
  return (
    <Box sx={{ borderLeft: `3px solid ${ROLE_COLOR[key] ?? PALETTE.gray}`, pl: 1.5, py: 0.5 }}>
      <Typography variant="caption" sx={{ color: ROLE_COLOR[key] ?? 'text.secondary', fontWeight: 700 }}>
        {label}{item.name ? ` · ${item.name}` : ''}
      </Typography>
      {isCall ? (
        <JsonBlock value={item.content} maxHeight={200} />
      ) : (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.content || '—'}</Typography>
      )}
    </Box>
  )
}

function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button
      size="small"
      onClick={onClick}
      aria-expanded={open}
      endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      sx={{ minHeight: 44, justifyContent: 'flex-start', color: 'text.primary' }}
    >
      {children}
    </Button>
  )
}

type Props = { request: LlmRequestEvent; sameSystemAsPrevious: boolean }

/** The exact chat context and tool list one LLM call received. */
export function PromptMessages({ request, sameSystemAsPrevious }: Props) {
  const { t } = useOpsLocale()
  const T = t.traces
  const messages = request.messages ?? []
  const system = messages.filter(isSystemItem)
  const history = messages.filter(m => !isSystemItem(m))
  const tools = request.tools ?? []
  const [systemOpen, setSystemOpen] = useState(!sameSystemAsPrevious)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [tool, setTool] = useState<string | null>(null)
  const selected = tools.find(x => x.name === tool)
  const systemKb = system.reduce((n, m) => n + m.content.length, 0) / 1024

  return (
    <Stack spacing={1}>
      {system.length > 0 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Toggle open={systemOpen} onClick={() => setSystemOpen(o => !o)}>
              {T.systemMessages} ({systemKb.toFixed(1)} KB)
            </Toggle>
            {sameSystemAsPrevious && <Chip size="small" label={T.sameAsPrevious} variant="outlined" />}
          </Stack>
          {systemOpen && (
            <Stack spacing={1}>
              {system.map((m, i) => (
                <JsonBlock key={i} value={m.content} text maxHeight={480} color={PALETTE.pale} />
              ))}
            </Stack>
          )}
        </Box>
      )}

      <Box>
        <Toggle open={historyOpen} onClick={() => setHistoryOpen(o => !o)}>{T.history(history.length)}</Toggle>
        {historyOpen && (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {history.map((item, i) => <HistoryItem key={`${i}-${item.call_id ?? ''}`} item={item} />)}
          </Stack>
        )}
      </Box>

      {tools.length > 0 && (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {T.toolsN(tools.length)}{request.tool_choice ? ` · ${T.toolChoice}=${request.tool_choice}` : ''}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {tools.map(x => (
              <Chip
                key={x.name}
                label={x.name}
                size="small"
                variant={tool === x.name ? 'filled' : 'outlined'}
                onClick={() => setTool(cur => (cur === x.name ? null : x.name))}
                aria-pressed={tool === x.name}
                sx={{ minHeight: 44 }}
              />
            ))}
          </Stack>
          {selected && (
            <Box sx={{ mt: 1 }}>
              <JsonBlock value={{ description: selected.description, parameters: selected.parameters }} />
            </Box>
          )}
        </Box>
      )}
    </Stack>
  )
}
