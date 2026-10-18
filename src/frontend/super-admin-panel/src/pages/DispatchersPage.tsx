import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, InputAdornment, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import { accountsService, type DispatcherAccount } from '../services/api/accounts'
import { useOpsLocale } from '../i18n/useOpsLocale'
import { StatusPill, InitialsAvatar } from '../components/StatusPill'
import { PALETTE } from '../styles/palette'
import { getErrorDetail } from '../utils/errors'

function randomPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(14))
  return 'Czen-' + [...bytes].map(b => alphabet[b % alphabet.length]).join('')
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function DispatchersPage() {
  const { t } = useOpsLocale()
  const d = t.dispatchers
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [toast, setToast] = useState('')

  const { data = [], isLoading, error } = useQuery({ queryKey: ['dispatchers'], queryFn: accountsService.listDispatchers })
  const create = useMutation({
    mutationFn: () => accountsService.createDispatcher(form),
    onSuccess: acc => {
      setOpen(false)
      setToast(d.createdToast(acc.email ?? form.email))
      setForm({ name: '', email: '', password: '' })
      void qc.invalidateQueries({ queryKey: ['dispatchers'] })
    },
  })
  const toggle = useMutation({
    mutationFn: (a: DispatcherAccount) => accountsService.setStatus(a.id, a.status === 'locked' ? 'offline' : 'locked'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['dispatchers'] }),
  })

  const rows = [...data].sort((a, b) => (a.status === 'locked' ? 1 : 0) - (b.status === 'locked' ? 1 : 0) || a.name.localeCompare(b.name))

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => { setForm(f => ({ ...f, password: randomPassword() })); setOpen(true) }}>
          {d.add}
        </Button>
      </Box>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{getErrorDetail(error, d.failed)}</Alert> : null}
      <TableContainer component={Paper} sx={{ border: `1px solid ${PALETTE.shellBorder}` }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {[d.name, d.email, d.status, d.created, d.actions].map(h => <TableCell key={h}>{h}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>{d.empty}</TableCell></TableRow>
            ) : rows.map(a => {
              const locked = a.status === 'locked'
              return (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <InitialsAvatar name={a.name} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{a.email ?? '—'}</TableCell>
                  <TableCell><StatusPill label={locked ? d.locked : d.active} tone={locked ? 'error' : 'success'} /></TableCell>
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDate(a.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={toggle.isPending}
                      startIcon={locked ? <LockOpenOutlinedIcon sx={{ fontSize: 16 }} /> : <LockOutlinedIcon sx={{ fontSize: 16 }} />}
                      sx={{ color: locked ? PALETTE.success : PALETTE.danger, borderColor: locked ? `${PALETTE.success}55` : `${PALETTE.danger}55` }}
                      onClick={() => { if (!locked && !window.confirm(d.confirmLock(a.name))) return; toggle.mutate(a) }}
                    >
                      {locked ? d.unlock : d.lock}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>{d.dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">{d.dialogHint}</Typography>
            <TextField label={d.name} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required fullWidth autoFocus />
            <TextField label={d.email} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required fullWidth />
            <TextField
              label={d.password}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
              fullWidth
              slotProps={{
                input: {
                  sx: { fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={d.generate}>
                        <IconButton onClick={() => setForm(f => ({ ...f, password: randomPassword() }))} edge="end" size="small" aria-label={d.generate}>
                          <AutorenewRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {create.error ? <Alert severity="error">{getErrorDetail(create.error, d.failed)}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setOpen(false)}>{d.cancel}</Button>
          <Button
            variant="contained"
            disabled={create.isPending || !form.name.trim() || !form.email.trim() || form.password.length < 10}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <CircularProgress size={18} color="inherit" /> : d.create}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} />
    </Box>
  )
}
