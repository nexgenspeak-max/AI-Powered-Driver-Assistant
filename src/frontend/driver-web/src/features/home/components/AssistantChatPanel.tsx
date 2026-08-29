import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Snackbar, Alert, TextField, Typography, Tooltip } from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import SendIcon from '@mui/icons-material/Send'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { useVoiceSessionStore, subscribeVoiceMessages } from '../stores/voiceSessionStore'
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
  const { chats, addUserMessage, addBotMessage, upsertStreamingMessage } = useAssistantChatStore()
  const voice = useVoiceSessionStore()
  const [msg, setMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stubLoading, setStubLoading] = useState(false)
  const chatBoxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return subscribeVoiceMessages((text, from, { isFinal, segmentId }) => {
      upsertStreamingMessage(from === 'user' ? 'me' : 'bot', text, isFinal, segmentId)
    })
  }, [upsertStreamingMessage])

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

    if (voice.status === 'connected') {
      upsertStreamingMessage('me', text, true)
      if (await voice.sendText(text)) {
        return
      }
    } else {
      addUserMessage(text)
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
      <Box sx={{
        position: 'absolute', right: 0, bottom: 0, height: '100%', width: { xs: '100%', sm: 380, md: 450 },
        display: 'flex', flexDirection: 'column',
        background: { xs: 'none', sm: 'none', md: `linear-gradient(to right, ${DARK.panelFadeFrom}, ${DARK.panelFadeTo} 60%, ${DARK.panelFadeTo})` },
        zIndex: 2,
      }}>
        <Box ref={chatBoxRef} sx={{
          flex: { xs: '0 1 auto', sm: '0 1 auto', md: 1 },
          maxHeight: { xs: 176, sm: 200, md: 'none' },
          mt: { xs: 'auto', sm: 'auto', md: 0 },
          overflowY: 'auto', display: 'flex', flexDirection: 'column', px: 1.5, pt: 2,
        }}>
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
          display: 'flex', alignItems: 'center', gap: 1, mx: { xs: 1, sm: 1.5 }, mb: { xs: 1.5, sm: 2 }, px: 1, height: 50,
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
