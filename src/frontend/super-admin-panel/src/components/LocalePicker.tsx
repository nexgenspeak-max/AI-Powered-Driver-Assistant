import {
  Box,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import { PALETTE } from '../styles/palette'
import {
  OPS_LOCALE_LIST,
  countryCodeToFlagEmoji,
  getOpsLocaleDefinition,
  isOpsLocale,
  type OpsLocale,
} from '../i18n/localeRegistry'
import { useOpsLocale } from '../i18n/useOpsLocale'

type Props = {
  variant?: 'sidebar' | 'compact'
}

export function LocalePicker({ variant = 'sidebar' }: Props) {
  const { locale, setLocale, t } = useOpsLocale()

  const onChange = (e: SelectChangeEvent<OpsLocale>) => {
    if (isOpsLocale(e.target.value)) {
      setLocale(e.target.value)
    }
  }

  const current = getOpsLocaleDefinition(locale)
  const sidebar = variant === 'sidebar'

  return (
    <FormControl fullWidth size="small" sx={{ mb: sidebar ? 1 : 0 }}>
      <InputLabel
        id="ops-ui-locale"
        sx={sidebar ? { color: PALETTE.shellMuted, '&.Mui-focused': { color: PALETTE.light } } : undefined}
      >
        {t.shell.language}
      </InputLabel>
      <Select
        labelId="ops-ui-locale"
        label={t.shell.language}
        value={locale}
        onChange={onChange}
        renderValue={() => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 24 }}>
            <Box component="span" sx={{ fontSize: 16 }}>
              {countryCodeToFlagEmoji(current.flagCountry)}
            </Box>
            {current.nativeLabel}
          </Box>
        )}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                maxHeight: 360,
                bgcolor: PALETTE.shellPanel,
                border: `1px solid ${PALETTE.shellBorder}`,
                backgroundImage: 'none',
              },
            },
          },
        }}
        sx={
          sidebar
            ? {
                color: PALETTE.pale,
                bgcolor: PALETTE.shellSearch,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: PALETTE.shellBorder },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: PALETTE.shellMuted },
                '& .MuiSvgIcon-root': { color: PALETTE.shellMuted },
              }
            : undefined
        }
      >
        {OPS_LOCALE_LIST.map(def => (
          <MenuItem key={def.code} value={def.code} sx={{ minHeight: 44, gap: 1.5 }}>
            <Box component="span" sx={{ fontSize: 18 }}>
              {countryCodeToFlagEmoji(def.flagCountry)}
            </Box>
            <ListItemText primary={def.nativeLabel} secondary={def.shortLabel} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
