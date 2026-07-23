import { Box, Typography } from '@mui/material'
import { ABOUT_PARAGRAPHS, ABOUT_TITLE } from '../data/faqData'
import { PALETTE } from '../../../styles/palette'

export default function AboutContent() {
  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, color: PALETTE.ink, mb: 2.5 }}>
        {ABOUT_TITLE}
      </Typography>
      {ABOUT_PARAGRAPHS.map((paragraph, i) => (
        <Typography key={i} variant="body1" sx={{ color: PALETTE.gray, lineHeight: 1.8, mb: 2 }}>
          {paragraph}
        </Typography>
      ))}
    </Box>
  )
}
