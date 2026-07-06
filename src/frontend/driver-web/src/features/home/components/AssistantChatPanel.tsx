import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Dialog, DialogContent, Snackbar, Alert, TextField, Typography, Tooltip } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import MicIcon from '@mui/icons-material/Mic'
import SendIcon from '@mui/icons-material/Send'
import { useAssistantChat } from '../hooks/useAssistantChat'
import { useVoiceSession } from '../hooks/useVoiceSession'
import { useAuthStore } from '../../../stores/authStore'
import { getAssistantReply } from '../../../services/api/assistant'

const DARK = {
  bubbleBot: 'rgb(31, 31, 31)',
  bubbleMe: '#35a4f3',
  panelFadeFrom: 'rgba(0,0,0,0)',
  panelFadeTo: 'rgba(0,0,0,0.85)',
}

const MIC_COLOR = {
  idle: '#fff',
  connecting: '#f5a623',
  connected: '#35a4f3',
  error: '#e05252',
}

const MIC_LABEL = {
  idle: 'Bấm để nói chuyện với AI',
  connecting: 'Đang kết nối...',
  connected: 'Đang trong phiên thoại — bấm để ngắt',
  error: 'Kết nối lỗi, thử lại',
}

export default function AssistantChatPanel() {
  const driver = useAuthStore(s => s.driver)
  const { chats, addUserMessage, addBotMessage } = useAssistantChat()
  const voice = useVoiceSession((text, from) => {
    if (from === 'user') addUserMessage(text)
    else addBotMessage(text)
  })
  const [msg, setMsg] = useState('')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stubLoading, setStubLoading] = useState(false)
  const chatBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' })
  }, [chats])

  const handleSend = async () => {
    if (!msg.trim()) {
      setError('Bạn chưa nhập nội dung.')
      return
    }
    const text = msg
    setMsg('')
    addUserMessage(text)

    if (voice.status === 'connected' && (await voice.sendText(text))) {
      return
    }

    setStubLoading(true)
    try {
      const reply = await getAssistantReply(text)
      addBotMessage(reply)
    } finally {
      setStubLoading(false)
    }
  }

  const handleMicClick = () => {
    if (voice.status === 'connected' || voice.status === 'connecting') {
      voice.disconnect()
      return
    }
    if (!driver?.phone) {
      setError('Không tìm thấy số điện thoại tài xế.')
      return
    }
    voice.connect(driver.phone)
  }

  return (
    <>
      <IconButton
        onClick={() => setAboutOpen(true)}
        sx={{ position: 'absolute', left: 16, top: 16, zIndex: 3, bgcolor: '#222', color: '#fff', borderRadius: 1.5, '&:hover': { bgcolor: '#333' } }}
      >
        <MenuIcon fontSize="small" />
      </IconButton>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)}>
        <DialogContent sx={{ bgcolor: '#1d1c1c', color: '#fff', textAlign: 'center', minWidth: 280 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Trợ lý 3D</Typography>
          <Typography variant="body2" sx={{ color: '#ccc' }}>
            Trợ lý ảo giúp bạn tra cứu chuyến đi và trả lời câu hỏi nhanh chóng.
          </Typography>
        </DialogContent>
      </Dialog>

      <Box sx={{
        position: 'absolute', right: 0, bottom: 0, height: '100%', width: { xs: '100%', sm: 400, md: 450 },
        display: 'flex', flexDirection: 'column',
        background: `linear-gradient(to right, ${DARK.panelFadeFrom}, ${DARK.panelFadeTo} 60%, ${DARK.panelFadeTo})`,
        zIndex: 2,
      }}>
        <Box ref={chatBoxRef} sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', px: 1.5, pt: 2 }}>
          {chats.map((chat, i) => (
            <Box
              key={i}
              sx={{
                maxWidth: 320, width: 'fit-content', color: '#fff', borderRadius: '10px',
                px: 2, py: 1.25, my: 0.5,
                bgcolor: chat.who === 'me' ? DARK.bubbleMe : DARK.bubbleBot,
                ml: chat.who === 'me' ? 'auto' : 0,
                mr: chat.who === 'me' ? 1.25 : 0,
              }}
            >
              <Typography variant="body2">{chat.msg}</Typography>
            </Box>
          ))}
          {stubLoading && (
            <Typography variant="caption" sx={{ color: '#999', px: 1.5 }}>Đang trả lời...</Typography>
          )}
        </Box>

        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1, mx: 1.5, mb: 2, px: 1, height: 50,
          borderRadius: 999, border: '1px solid rgba(255,255,255,0.7)', bgcolor: 'rgba(50,49,49,0.68)',
        }}>
          <Tooltip title={MIC_LABEL[voice.status]}>
            <IconButton size="small" onClick={handleMicClick} sx={{ color: MIC_COLOR[voice.status] }}>
              <MicIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <TextField
            variant="standard"
            fullWidth
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder="Nói gì đó..."
            slotProps={{ input: { disableUnderline: true, sx: { color: '#fff' } } }}
          />
          <IconButton size="small" onClick={handleSend} sx={{ color: '#fff' }}>
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </>
  )
}
