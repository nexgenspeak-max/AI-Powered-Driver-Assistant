import { Box, Container } from '@mui/material'
import HeaderComponent from '../features/home/components/HeaderComponent'
import AboutContent from '../features/info/components/AboutContent'
import { PALETTE } from '../styles/palette'

export default function AboutPage() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: PALETTE.pale }}>
      <HeaderComponent />
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <AboutContent />
      </Container>
    </Box>
  )
}
