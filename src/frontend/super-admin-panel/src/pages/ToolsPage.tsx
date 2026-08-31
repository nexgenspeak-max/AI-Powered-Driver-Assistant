import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Chip, Stack, TextField } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { opsService } from '../services/api/ops'
import type { ToolEntry } from '../types/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { SettingsRow } from '../layouts/SettingsRow'
import { SettingsSection } from '../layouts/SettingsSection'
import { VoiceBrowseTrail } from '../layouts/VoiceBrowseTrail'
import { readVoiceQuery } from '../layouts/voiceQuery'

const REFETCH_MS = 12_000

function groupTools(tools: ToolEntry[], missingLabel: string): Array<[string, ToolEntry[]]> {
  const map = new Map<string, ToolEntry[]>()
  for (const tool of tools) {
    const key = tool.in_schema ? tool.section : missingLabel
    const list = map.get(key) ?? []
    list.push(tool)
    map.set(key, list)
  }
  return [...map.entries()]
}

export default function ToolsPage() {
  const { t } = useOpsLocale()
  const { search } = useLocation()
  const browse = readVoiceQuery(search)
  const [q, setQ] = useState('')
  const { data, error } = useQuery({
    queryKey: ['ops-agent'],
    queryFn: opsService.agent,
    refetchInterval: REFETCH_MS,
  })

  const groups = useMemo(() => {
    const tools = (data?.tools ?? []).filter(tool => {
      if (browse.lang && !tool.locales.includes(browse.lang)) {
        return false
      }
      if (browse.section) {
        const key = tool.in_schema ? tool.section : t.tools.missingSchema
        return key === browse.section
      }
      return true
    })
    const needle = q.trim().toLowerCase()
    const filtered = needle
      ? tools.filter(tool =>
          tool.name.toLowerCase().includes(needle)
          || tool.description.toLowerCase().includes(needle)
          || tool.section.toLowerCase().includes(needle))
      : tools
    return groupTools(filtered, t.tools.missingSchema)
  }, [data?.tools, q, t.tools.missingSchema, browse.lang, browse.section])

  if (error) {
    return <Alert severity="error">{t.agent.empty}</Alert>
  }
  if (!data) {
    return null
  }
  if (data.tools.length === 0) {
    return <Alert severity="info">{t.tools.empty}</Alert>
  }

  return (
    <>
      <VoiceBrowseTrail feature={t.nav.tools.label} />
      <TextField
        size="small"
        fullWidth
        label={t.tools.search}
        value={q}
        onChange={e => setQ(e.target.value)}
        sx={{ mb: 1 }}
      />
      {groups.map(([section, tools]) => (
        <SettingsSection key={section} title={section}>
          {tools.map(tool => (
            <SettingsRow
              key={tool.name}
              label={tool.name}
              hint={tool.description
                ? (tool.description.length > 220 ? `${tool.description.slice(0, 220)}…` : tool.description)
                : undefined}
              value={
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip size="small" label={tool.audience === 'customer' ? t.tools.customer : t.tools.driver} />
                  <Chip size="small" variant="outlined" label={tool.locales.join(', ')} />
                </Stack>
              }
            />
          ))}
        </SettingsSection>
      ))}
    </>
  )
}
