import { useState } from 'react'
import {
  Box,
  IconButton,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { PALETTE } from '../styles/palette'
import {
  ADMIN_LOCALE_LIST,
  countryCodeToFlagEmoji,
  getAdminLocaleDefinition,
  type AdminLocale,
} from '../i18n/localeRegistry'
import { useAdminLocale } from '../i18n/useAdminLocale'

type Props = {
  /** Sidebar dropdown (dark) · login card · collapsed icon-only trigger. */
  variant?: 'sidebar' | 'compact' | 'collapsed'
}

/** Scales to N locales — one trigger + menu instead of a stacked list. */
export function AdminLocalePicker({ variant = 'sidebar' }: Props) {
  const { locale, setLocale, t } = useAdminLocale()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)
  const open = Boolean(anchor)
  const current = getAdminLocaleDefinition(locale)

  const pick = (id: AdminLocale) => {
    setLocale(id)
    setAnchor(null)
  }

  const menu = (
    <Menu
      anchorEl={anchor}
      open={open}
      onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: 'top', horizontal: variant === 'collapsed' ? 'right' : 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: variant === 'collapsed' ? 'left' : 'left' }}
      slotProps={{
        paper: {
          sx: {
            minWidth: 200,
            bgcolor: PALETTE.shellPanel,
            border: `1px solid ${PALETTE.shellBorder}`,
            backgroundImage: 'none',
          },
        },
      }}
    >
      {ADMIN_LOCALE_LIST.map(({ id, locale: def }) => {
        const selected = locale === id
        return (
          <MenuItem
            key={id}
            selected={selected}
            onClick={() => pick(id)}
            sx={{ gap: 1.5, minHeight: 44 }}
          >
            <Box component="span" sx={{ fontSize: 18, width: 24, textAlign: 'center' }}>
              {countryCodeToFlagEmoji(def.flagCountry)}
            </Box>
            <ListItemText
              primary={def.nativeLabel}
              secondary={def.shortLabel}
              slotProps={{
                primary: { sx: { fontSize: 14, fontWeight: selected ? 600 : 400 } },
                secondary: { sx: { fontSize: 11 } },
              }}
            />
            {selected ? <CheckIcon sx={{ fontSize: 18, color: PALETTE.light, ml: 'auto' }} /> : null}
          </MenuItem>
        )
      })}
    </Menu>
  )

  if (variant === 'compact') {
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={t.shell.language}
        value={locale}
        onChange={e => setLocale(e.target.value as AdminLocale)}
        slotProps={{
          select: {
            renderValue: (value) => {
              const def = getAdminLocaleDefinition(value as AdminLocale)
              return (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                  <span aria-hidden>{countryCodeToFlagEmoji(def.flagCountry)}</span>
                  {def.nativeLabel}
                </Box>
              )
            },
          },
        }}
      >
        {ADMIN_LOCALE_LIST.map(({ id, locale: def }) => (
          <MenuItem key={id} value={id} sx={{ gap: 1.5 }}>
            <span aria-hidden>{countryCodeToFlagEmoji(def.flagCountry)}</span>
            {def.nativeLabel}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  if (variant === 'collapsed') {
    return (
      <>
        <IconButton
          onClick={e => setAnchor(e.currentTarget)}
          aria-label={t.shell.language}
          aria-haspopup="listbox"
          aria-expanded={open}
          sx={{
            width: 40,
            height: 40,
            fontSize: 18,
            borderRadius: 1.5,
            color: PALETTE.shellText,
            '&:hover': { bgcolor: PALETTE.shellNavHover },
          }}
        >
          {countryCodeToFlagEmoji(current.flagCountry)}
        </IconButton>
        {menu}
      </>
    )
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" sx={{ px: 0.5, color: PALETTE.shellMuted, fontWeight: 600, display: 'block', mb: 0.5 }}>
        {t.shell.language}
      </Typography>
      <ListItemButton
        onClick={e => setAnchor(e.currentTarget)}
        aria-haspopup="listbox"
        aria-expanded={open}
        sx={{
          borderRadius: 1.5,
          minHeight: 44,
          py: 0.75,
          px: 1,
          color: PALETTE.shellText,
          bgcolor: PALETTE.shellSearch,
          '&:hover': { bgcolor: PALETTE.shellNavHover },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, fontSize: 18 }}>
          {countryCodeToFlagEmoji(current.flagCountry)}
        </ListItemIcon>
        <ListItemText
          primary={current.nativeLabel}
          secondary={current.shortLabel}
          slotProps={{
            primary: { sx: { fontSize: 14, fontWeight: 500 } },
            secondary: { sx: { fontSize: 11, color: PALETTE.shellMuted } },
          }}
        />
        <ExpandMoreIcon sx={{ color: PALETTE.shellMuted, fontSize: 20 }} />
      </ListItemButton>
      {menu}
    </Box>
  )
}
