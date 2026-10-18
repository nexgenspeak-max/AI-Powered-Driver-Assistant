import { Box, Button, InputAdornment, TextField, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { InitialsAvatar } from './StatusPill'
import { PALETTE } from '../styles/palette'

export function PersonCell({ name, sub }: { name: string; sub?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <InitialsAvatar name={name} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{name || '—'}</Typography>
        {sub ? <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{sub}</Typography> : null}
      </Box>
    </Box>
  )
}

export function LockButton({ locked, disabled, lockLabel, unlockLabel, onClick }: {
  locked: boolean; disabled?: boolean; lockLabel: string; unlockLabel: string; onClick: () => void
}) {
  return (
    <Button
      size="small"
      variant="outlined"
      color={locked ? 'success' : 'error'}
      disabled={disabled}
      onClick={onClick}
      startIcon={locked ? <LockOpenOutlinedIcon sx={{ fontSize: 16 }} /> : <LockOutlinedIcon sx={{ fontSize: 16 }} />}
      sx={{ borderColor: locked ? `${PALETTE.success}55` : `${PALETTE.danger}55`, color: locked ? PALETTE.success : PALETTE.danger }}
    >
      {locked ? unlockLabel : lockLabel}
    </Button>
  )
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <Box sx={{ p: 2, borderBottom: `1px solid ${PALETTE.shellBorder}` }}>
      <TextField
        size="small"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        sx={{ maxWidth: 360, width: '100%' }}
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
      />
    </Box>
  )
}
