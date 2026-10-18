import { Box, Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { groupLabel, navItemDescription, navItemLabel } from '../i18n/navText'
import { PALETTE } from '../styles/palette'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { getOpsNavItem } from './navRegistry'

export function SettingsPageFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const meta = getOpsNavItem(pathname)
  const { locale, t } = useOpsLocale()
  const title = meta ? navItemLabel(meta, locale) : t.shell.fallbackName
  const description = meta ? navItemDescription(meta, locale) : undefined
  const group = meta ? groupLabel(meta.group, locale) : ''

  return (
    <Box sx={{ width: '100%', maxWidth: 1440, mx: 'auto' }}>
      <Box sx={{ mb: 3, pb: 2.5, borderBottom: `1px solid ${PALETTE.shellBorder}` }}>
        {group ? (
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: PALETTE.light, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.75 }}>
            {group}
          </Typography>
        ) : null}
        <Typography variant="h4" component="h1" sx={{ color: 'text.primary', mb: description ? 0.75 : 0 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '72ch', lineHeight: 1.55 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  )
}
