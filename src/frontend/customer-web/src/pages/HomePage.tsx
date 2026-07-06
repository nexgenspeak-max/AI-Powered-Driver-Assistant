import { Box } from '@mui/material'
import HeaderComponent from '../features/home/components/HeaderComponent'
import AssistantScene from '../features/home/components/AssistantScene'
import AssistantChatPanel from '../features/home/components/AssistantChatPanel'

export default function HomePage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <HeaderComponent />
      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, bgcolor: '#0d1117', overflow: 'hidden' }}>
        <AssistantScene />
        <AssistantChatPanel />
      </Box>
    </Box>
  )
}
