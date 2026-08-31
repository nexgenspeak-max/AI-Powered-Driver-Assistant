import { Box, Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { navItemDescription, navItemLabel } from '../i18n/navText'
import { useAdminLocale } from '../i18n/useAdminLocale'
import { contentMaxWidth } from '../styles/shellStyles'
import { getAdminNavItem } from './navRegistry'

export function SettingsPageFrame({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const meta = getAdminNavItem(pathname)
  const { locale, t } = useAdminLocale()

  const title = meta ? navItemLabel(meta, locale) : t.shell.fallbackAdmin
  const description = meta ? navItemDescription(meta, locale) : undefined

  return (
    <Box sx={{ width: '100%', maxWidth: contentMaxWidth, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 600, color: 'text.primary', mb: description ? 0.75 : 0, letterSpacing: '-0.02em' }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '60ch', lineHeight: 1.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  )
}
