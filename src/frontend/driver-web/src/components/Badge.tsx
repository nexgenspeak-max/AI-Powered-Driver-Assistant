import { Box, Typography } from '@mui/material'

type BadgeProps = {
  label: string
  backgroundColor: string
  color: string
}

export default function Badge({ label, backgroundColor, color }: BadgeProps) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.35,
        borderRadius: 999,
        bgcolor: backgroundColor,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, color, lineHeight: 1.4 }}>
        {label}
      </Typography>
    </Box>
  )
}
