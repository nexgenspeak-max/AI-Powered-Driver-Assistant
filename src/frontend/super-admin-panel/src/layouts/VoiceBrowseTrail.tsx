import { Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { promptFileLabel, readVoiceQuery } from './voiceQuery'

export function VoiceBrowseTrail({ feature }: { feature: string }) {
  const { search } = useLocation()
  const { t } = useOpsLocale()
  const q = readVoiceQuery(search)
  const bits = [q.lang, feature, q.section || (q.file ? promptFileLabel(q.file) : '')].filter(Boolean)
  if (bits.length === 0) {
    return null
  }
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
      {t.cascade.viewing}: {bits.join(' › ')}
    </Typography>
  )
}
