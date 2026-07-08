import { Accordion, AccordionDetails, AccordionSummary, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { FAQ_ITEMS } from '../data/faqData'
import { PALETTE } from '../../../styles/palette'

export default function FaqContent() {
  return (
    <>
      {FAQ_ITEMS.map((item, i) => (
        <Accordion
          key={i}
          disableGutters
          sx={{
            bgcolor: '#fff',
            boxShadow: 'none',
            border: `1px solid ${PALETTE.border}`,
            borderRadius: '12px !important',
            mb: 1.25,
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: '0 0 10px 0' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon sx={{ color: PALETTE.gray }} />}
            sx={{ px: 2, minHeight: 52, '&.Mui-expanded': { minHeight: 52 } }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600, color: PALETTE.ink }}>
              {item.question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0, pb: 2.25 }}>
            <Typography variant="body2" sx={{ color: PALETTE.gray, lineHeight: 1.7 }}>
              {item.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  )
}
