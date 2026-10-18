import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { StatusPill } from '../components/StatusPill'
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined'
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
import { opsService } from '../services/api/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { PALETTE } from '../styles/palette'
import { StatCardGrid } from '../components/StatCard'
import { SettingsPanel } from '../layouts/SettingsPanel'
import { SettingsRow } from '../layouts/SettingsRow'

export default function OverviewPage() {
  const { t } = useOpsLocale()
  const statusQ = useQuery({
    queryKey: ['ops-status'],
    queryFn: opsService.status,
    refetchInterval: 10_000,
  })
  const agentQ = useQuery({
    queryKey: ['ops-agent'],
    queryFn: opsService.agent,
    refetchInterval: 12_000,
  })

  const diskQ = useQuery({
    queryKey: ['ops-disk'],
    queryFn: opsService.disk,
    refetchInterval: 15_000,
  })

  const services = statusQ.data?.services ?? []
  const disk = diskQ.data
  const logsBytes = (disk?.dirs ?? []).reduce((sum, d) => sum + (d.bytes ?? 0), 0)
  const up = services.filter(s => s.ok).length
  const agent = agentQ.data

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button onClick={() => { void statusQ.refetch(); void agentQ.refetch(); void diskQ.refetch() }} variant="outlined" sx={{ minHeight: 44 }}>
          {t.overview.refresh}
        </Button>
      </Box>

      <StatCardGrid
        stats={[
          {
            label: t.overview.servicesUp,
            value: `${up}/${services.length || '–'}`,
            color: PALETTE.success,
            icon: <CloudDoneOutlinedIcon fontSize="small" />,
          },
          {
            label: t.overview.locales,
            value: agent?.locales.length ?? '–',
            color: PALETTE.info,
            icon: <TranslateOutlinedIcon fontSize="small" />,
          },
          {
            label: t.overview.tools,
            value: agent?.tool_count ?? '–',
            color: PALETTE.mid,
            icon: <ConstructionOutlinedIcon fontSize="small" />,
          },
          {
            label: t.overview.prompts,
            value: agent?.prompt_count ?? '–',
            color: PALETTE.light,
            icon: <ArticleOutlinedIcon fontSize="small" />,
          },
          {
            label: t.overview.defaultLocale,
            value: agent?.default_locale ?? '–',
            color: PALETTE.light,
            icon: <LanguageOutlinedIcon fontSize="small" />,
          },
          {
            label: t.overview.disk,
            value: disk ? `${disk.used_pct}%` : '–',
            color: disk && disk.used_pct >= 90 ? PALETTE.danger : PALETTE.mid,
            icon: <StorageOutlinedIcon fontSize="small" />,
          },
        ]}
      />

      {disk ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t.overview.diskDetail((disk.free_bytes / 1e9).toFixed(1), (logsBytes / 1e6).toFixed(1))}
        </Typography>
      ) : null}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
        {t.overview.readOnly}
      </Typography>

      {statusQ.error ? <Alert severity="error" sx={{ mb: 2 }}>{t.overview.empty}</Alert> : null}

      <SettingsPanel>
        {services.map(svc => (
          <SettingsRow
            key={svc.id}
            label={svc.id}
            hint={svc.detail && svc.detail !== '-' && svc.detail !== 'self' ? svc.detail : undefined}
            value={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">{t.overview.latency(svc.latency_ms)}</Typography>
                <StatusPill label={svc.ok ? t.overview.up : t.overview.down} tone={svc.ok ? 'success' : 'error'} />
              </Stack>
            }
          />
        ))}
      </SettingsPanel>
    </Box>
  )
}
