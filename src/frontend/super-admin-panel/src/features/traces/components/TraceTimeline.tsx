import { useEffect, useRef, useState } from 'react'
import { Box, Button, Stack } from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { Turn } from '../groupTurns'
import { TurnCard } from './TurnCard'

const STICK_TO_BOTTOM_PX = 80

type Props = { turns: Turn[]; startTs?: number; live: boolean; eventCount: number }

/** Turn cards in a scroll box that follows new turns while live, unless the admin scrolled up. */
export function TraceTimeline({ turns, startTs, live, eventCount }: Props) {
  const { t } = useOpsLocale()
  const boxRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(true)

  useEffect(() => {
    const box = boxRef.current
    if (box && live && stuck) box.scrollTop = box.scrollHeight
  }, [eventCount, live, stuck])

  const onScroll = () => {
    const box = boxRef.current
    if (box) setStuck(box.scrollHeight - box.scrollTop - box.clientHeight < STICK_TO_BOTTOM_PX)
  }

  const jump = () => {
    const box = boxRef.current
    if (box) box.scrollTop = box.scrollHeight
    setStuck(true)
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={boxRef}
        onScroll={onScroll}
        sx={{ maxHeight: { xs: 'none', md: 'calc(100vh - 320px)' }, minHeight: 240, overflow: 'auto', pr: 1 }}
      >
        <Stack spacing={2}>
          {turns.map(turn => <TurnCard key={turn.index} turn={turn} startTs={startTs} />)}
        </Stack>
      </Box>
      {live && !stuck && (
        <Button
          variant="contained"
          size="small"
          startIcon={<ArrowDownwardIcon />}
          onClick={jump}
          sx={{ position: 'absolute', right: 16, bottom: 16, minHeight: 44 }}
        >
          {t.traces.jumpToLatest}
        </Button>
      )}
    </Box>
  )
}
