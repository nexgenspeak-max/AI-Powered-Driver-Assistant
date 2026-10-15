import { Paper, Stack, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined'
import { PALETTE } from '../../../styles/palette'
import { useOpsLocale } from '../../../i18n/useOpsLocale'
import type { Insight, InsightSeverity } from '../insights'

const ICON: Record<InsightSeverity, typeof InfoOutlinedIcon> = {
  error: ErrorOutlineIcon,
  warning: WarningAmberIcon,
  info: InfoOutlinedIcon,
}

const COLOR: Record<InsightSeverity, string> = {
  error: PALETTE.danger,
  warning: PALETTE.warning,
  info: PALETTE.info,
}

/** Improvement hints derived from the session's events (see insights.ts). */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  const { t } = useOpsLocale()
  const T = t.traces
  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: PALETTE.shellPanel, borderColor: PALETTE.shellBorder }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <TipsAndUpdatesOutlinedIcon fontSize="small" sx={{ color: PALETTE.light }} />
        <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>{T.insightsTitle}</Typography>
      </Stack>
      {insights.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{T.noInsights}</Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {insights.map(i => {
            const Icon = ICON[i.severity]
            return (
              <Stack component="li" key={i.key} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Icon fontSize="small" sx={{ color: COLOR[i.severity], mt: 0.25 }} />
                <Typography variant="body2">{T.insights[i.key](i.params)}</Typography>
              </Stack>
            )
          })}
        </Stack>
      )}
    </Paper>
  )
}
