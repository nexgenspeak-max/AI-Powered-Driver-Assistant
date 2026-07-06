import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Avatar, Box, IconButton, InputAdornment, ListItemIcon, ListItemText,
  Menu, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import SearchIcon from '@mui/icons-material/Search'
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import TranslateIcon from '@mui/icons-material/Translate'
import CheckIcon from '@mui/icons-material/Check'
import { useAuthStore } from '../../../stores/authStore'
import { PALETTE } from '../../../styles/palette'

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
]

type HeaderComponentProps = {
  onSearchAddress?: (address: string) => void
}

export default function HeaderComponent({ onSearchAddress }: HeaderComponentProps) {
  const navigate = useNavigate()
  const customer = useAuthStore(s => s.customer)
  const logout = useAuthStore(s => s.logout)

  const [address, setAddress] = useState('')
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null)
  const [lang, setLang] = useState('vi')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchAddress?.(address)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = customer?.name ? customer.name.trim().charAt(0).toUpperCase() : ''

  const iconBtnSx = {
    width: 40, height: 40, bgcolor: '#fff', color: PALETTE.base,
    border: `1px solid ${PALETTE.border}`,
    boxShadow: `0 2px 6px ${PALETTE.base}12`,
    transition: 'all 0.15s ease',
    '&:hover': { bgcolor: PALETTE.pale, borderColor: PALETTE.light, transform: 'translateY(-1px)', boxShadow: `0 4px 10px ${PALETTE.base}1f` },
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, px: { xs: 2, sm: 3 }, py: 1.5,
      bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
      boxShadow: `0 2px 12px ${PALETTE.base}14`, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Box component={Link} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', flexShrink: 0 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${PALETTE.light} 0%, ${PALETTE.base} 100%)`,
          boxShadow: `0 4px 10px ${PALETTE.base}40`,
        }}>
          <DirectionsCarIcon sx={{ color: '#fff', fontSize: 21 }} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.01em', color: PALETTE.ink, display: { xs: 'none', sm: 'block' } }}>
          Czen
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSearchSubmit} sx={{ flex: 1, maxWidth: 520, mx: 'auto' }}>
        <TextField
          fullWidth
          size="small"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Bạn muốn đến đâu?"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: PALETTE.mid }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '999px',
              backgroundColor: PALETTE.surface,
              transition: 'box-shadow 0.15s ease',
              '& fieldset': { borderColor: PALETTE.border },
              '&:hover fieldset': { borderColor: PALETTE.light },
              '&.Mui-focused': { boxShadow: `0 4px 14px ${PALETTE.base}26` },
              '&.Mui-focused fieldset': { borderColor: PALETTE.base, borderWidth: '1.5px' },
            },
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Tooltip title="Ngôn ngữ">
          <IconButton onClick={e => setLangAnchor(e.currentTarget)} sx={iconBtnSx}>
            <TranslateIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={langAnchor}
          open={!!langAnchor}
          onClose={() => setLangAnchor(null)}
          slotProps={{ paper: { sx: { mt: 1, borderRadius: 2, boxShadow: `0 8px 24px ${PALETTE.base}26` } } }}
        >
          {LANGUAGES.map(l => (
            <MenuItem key={l.code} selected={lang === l.code} onClick={() => { setLang(l.code); setLangAnchor(null) }}>
              {lang === l.code && (
                <ListItemIcon>
                  <CheckIcon fontSize="small" sx={{ color: PALETTE.base }} />
                </ListItemIcon>
              )}
              <ListItemText inset={lang !== l.code}>{l.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>

        <Tooltip title="Hồ sơ của bạn">
          <IconButton component={Link} to="/profile" sx={iconBtnSx}>
            {initials ? (
              <Avatar sx={{
                width: 26, height: 26, fontSize: 13, fontWeight: 700, color: '#fff',
                background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
              }}>
                {initials}
              </Avatar>
            ) : (
              <PersonOutlineOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        <Tooltip title="Đăng xuất">
          <IconButton onClick={handleLogout} sx={iconBtnSx}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
