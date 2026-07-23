import { Stack, Typography } from '@mui/material'

export default function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 500, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  )
}
