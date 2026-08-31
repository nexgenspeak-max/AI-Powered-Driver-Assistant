import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Chip } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { opsService } from '../services/api/ops'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { SettingsRow } from '../layouts/SettingsRow'
import { SettingsSection } from '../layouts/SettingsSection'
import { VoiceBrowseTrail } from '../layouts/VoiceBrowseTrail'
import { readVoiceQuery } from '../layouts/voiceQuery'

function KeyChip({ ok, t }: { ok: boolean; t: { keySet: string; keyMissing: string } }) {
  return <Chip size="small" color={ok ? 'success' : 'default'} label={ok ? t.keySet : t.keyMissing} />
}

const REFETCH_MS = 12_000

export default function AgentPage() {
  const { t } = useOpsLocale()
  const { search } = useLocation()
  const { lang } = readVoiceQuery(search)
  const { data, error } = useQuery({
    queryKey: ['ops-agent'],
    queryFn: opsService.agent,
    refetchInterval: REFETCH_MS,
  })

  if (error) {
    return <Alert severity="error">{t.agent.empty}</Alert>
  }
  if (!data) {
    return null
  }

  const { models, livekit, flags, locales, env_public, secret_keys } = data
  const onOff = (v: boolean) => (v ? t.agent.enabled : t.agent.disabled)
  const localeRows = lang ? locales.filter(loc => loc.id === lang) : locales

  return (
    <>
      <VoiceBrowseTrail feature={t.nav.agent.label} />
      <SettingsSection title={t.agent.stt}>
        <SettingsRow label={t.agent.provider} value={models.stt.provider} />
        <SettingsRow label={t.agent.model} value={models.stt.model} />
        <SettingsRow label={t.agent.language} value={models.stt.language} />
        <SettingsRow label={t.agent.googleModel} value={models.stt.google_model} />
        <SettingsRow label={t.agent.googleLocation} value={models.stt.google_location} />
      </SettingsSection>

      <SettingsSection title={t.agent.llm}>
        <SettingsRow label={t.agent.provider} value={models.llm.provider} />
        <SettingsRow label={t.agent.model} value={models.llm.model} />
      </SettingsSection>

      <SettingsSection title={t.agent.tts}>
        <SettingsRow label={t.agent.provider} value={models.tts.provider} />
        <SettingsRow label={t.agent.voice} value={models.tts.voice} />
        <SettingsRow label={t.agent.googleVoice} value={models.tts.google_voice} />
        <SettingsRow label={t.agent.elevenlabsModel} value={models.tts.elevenlabs_model} />
      </SettingsSection>

      <SettingsSection title={t.agent.livekit}>
        <SettingsRow label={t.agent.livekitUrl} value={livekit.url} />
        <SettingsRow label={t.agent.agentName} value={livekit.agent_name} />
        <SettingsRow label={t.agent.source} value={data.source} />
        <SettingsRow label={t.agent.updated} value={data.env_mtime} />
        <SettingsRow label={t.agent.defaultLocale} value={data.default_locale} />
        <SettingsRow label={t.agent.faq} value={onOff(flags.faq_rag)} />
        <SettingsRow label={t.agent.silence} value={onOff(flags.silence_tracker)} />
      </SettingsSection>

      {localeRows.length > 0 ? (
        <SettingsSection title={t.agent.locales}>
          {localeRows.map(loc => (
            <SettingsRow
              key={loc.id}
              label={loc.id}
              hint={`STT ${loc.stt} · TTS ${loc.tts_voice} · ${loc.turn_detection}`}
              value={loc.spoken}
            />
          ))}
        </SettingsSection>
      ) : null}

      <SettingsSection title={t.agent.secrets}>
        {secret_keys.length === 0 ? (
          <SettingsRow label="—" value={<KeyChip ok={false} t={t.agent} />} />
        ) : (
          secret_keys.map(key => (
            <SettingsRow key={key} label={key} value={<KeyChip ok t={t.agent} />} />
          ))
        )}
      </SettingsSection>

      <SettingsSection title={t.agent.envPublic}>
        {env_public.map(row => (
          <SettingsRow
            key={row.key}
            label={row.key}
            value={
              <Box sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, wordBreak: 'break-all', maxWidth: { xs: 160, sm: 360 } }}>
                {row.value}
              </Box>
            }
          />
        ))}
      </SettingsSection>
    </>
  )
}
