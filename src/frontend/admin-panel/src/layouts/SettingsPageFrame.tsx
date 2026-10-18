import { Box, Typography } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { groupLabel, navItemDescription, navItemLabel } from '../i18n/navText'
import { PALETTE } from '../styles/palette'
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
      <Box sx={{ mb: 3, pb: 2.5, borderBottom: `1px solid ${PALETTE.shellBorder}` }}>
        {meta ? (
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: PALETTE.light, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 0.75 }}>
            {groupLabel(meta.group, locale)}
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
