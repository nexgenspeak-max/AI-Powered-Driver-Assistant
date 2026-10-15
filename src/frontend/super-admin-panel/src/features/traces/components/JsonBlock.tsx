import { Box } from '@mui/material'
import { PALETTE } from '../../../styles/palette'
import { MONO_FONT, prettyJson } from '../format'

type Props = {
  value: unknown
  /** Raw text instead of JSON (prompts). */
  text?: boolean
  maxHeight?: number
  color?: string
}

/** Monospace, wrapped, scrollable block for JSON payloads and prompt text. */
export function JsonBlock({ value, text = false, maxHeight = 360, color }: Props) {
  const body = text ? String(value ?? '') : prettyJson(value)
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        fontFamily: MONO_FONT,
        fontSize: 12.5,
        lineHeight: 1.5,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        bgcolor: PALETTE.shellContent,
        color: color ?? PALETTE.shellText,
        border: `1px solid ${PALETTE.shellBorder}`,
        borderRadius: 1,
        maxHeight,
        overflow: 'auto',
      }}
    >
      {body || '—'}
    </Box>
  )
}
