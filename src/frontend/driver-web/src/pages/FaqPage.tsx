import { Box, Container, Typography } from '@mui/material'
import HeaderComponent from '../features/home/components/HeaderComponent'
import FaqContent from '../features/info/components/FaqContent'
import { PALETTE } from '../styles/palette'

export default function FaqPage() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: PALETTE.pale }}>
      <HeaderComponent />
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: PALETTE.ink, mb: 2.5 }}>
          Câu hỏi thường gặp
        </Typography>
        <FaqContent />
      </Container>
    </Box>
  )
}
