import { Box, Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { navItemDescription, navItemLabel } from '../i18n/navText'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { ROUTES } from '../constants/routes'
import { getOpsNavItem } from './navRegistry'

export function SettingsPageFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const meta = getOpsNavItem(pathname)
  const { locale, t } = useOpsLocale()
  const title = meta ? navItemLabel(meta, locale) : t.shell.fallbackName
  const description = meta ? navItemDescription(meta, locale) : undefined
  const wide = pathname === ROUTES.LOGS || pathname === ROUTES.PROMPTS

  return (
    <Box sx={{ width: '100%', maxWidth: wide ? 1400 : 960, mx: 'auto' }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 600, color: 'text.primary', mb: description ? 1 : 3, letterSpacing: '-0.02em' }}
      >
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: '65ch' }}>
          {description}
        </Typography>
      ) : null}
      {children}
    </Box>
  )
}
