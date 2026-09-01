import { useEffect, useRef, useState } from 'react'
import {
  Box, CardContent, IconButton, InputAdornment, Snackbar, Alert,
  TextField, Typography, Tooltip,
} from '@mui/material'
import MicIcon from '@mui/icons-material/Mic'
import SendIcon from '@mui/icons-material/Send'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { useVoiceSessionStore, subscribeVoiceMessages } from '../stores/voiceSessionStore'
import { useAuthStore } from '../../../stores/authStore'
import { getAssistantReply } from '../../../services/api/assistant'
import SurfaceCard from '../../../components/SurfaceCard'
import { PALETTE } from '../../../styles/palette'

const MIC_LABEL = {
  idle: 'Bấm để nói chuyện với AI',
  connecting: 'Đang kết nối...',
  connected: 'Đang trong phiên thoại — bấm để ngắt',
  error: 'Kết nối lỗi, thử lại',
} as const

export default function AssistantChatPanel() {
  const customer = useAuthStore(s => s.customer)
  const { chats, addUserMessage, addBotMessage, upsertStreamingMessage } = useAssistantChatStore()
  const voice = useVoiceSessionStore()
  const [msg, setMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stubLoading, setStubLoading] = useState(false)
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)

  useEffect(() => {
    return subscribeVoiceMessages((text, from, { isFinal, segmentId }) => {
      upsertStreamingMessage(from === 'user' ? 'me' : 'bot', text, isFinal, segmentId)
    })
  }, [upsertStreamingMessage])

  useEffect(() => {
    chatBoxRef.current?.scrollTo({ top: chatBoxRef.current.scrollHeight, behavior: 'smooth' })
  }, [chats])

  const handleSend = async () => {
    if (sendingRef.current) return
    if (!msg.trim()) {
      setError('Bạn chưa nhập nội dung.')
      return
    }
    sendingRef.current = true
    const text = msg
    setMsg('')
    setError(null)
    try {
      if (voice.status === 'connected') {
        upsertStreamingMessage('me', text, true)
        if (await voice.sendText(text)) return
      } else {
        addUserMessage(text)
      }

      setStubLoading(true)
      const reply = await getAssistantReply(text)
      addBotMessage(reply)
    } finally {
      setStubLoading(false)
      sendingRef.current = false
    }
  }

  const handleMicClick = () => {
    if (voice.status === 'connected' || voice.status === 'connecting') {
      voice.disconnect({ userInitiated: true })
      return
    }
    if (!customer?.phone) {
      setError('Không tìm thấy số điện thoại khách hàng.')
      return
    }
    voice.connect(customer.phone)
  }

  const micColor =
    voice.status === 'connected' ? PALETTE.info
      : voice.status === 'connecting' ? PALETTE.warning
        : voice.status === 'error' ? PALETTE.danger
          : PALETTE.textSecondary

  return (
    <>
      <SurfaceCard sx={{ display: 'flex', flexDirection: 'column', minHeight: { xs: 380, md: 520 } }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0, '&:last-child': { pb: 0 } }}>
          <Box sx={{ px: 3, pt: 3, pb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Trợ lý AI</Typography>
            <Typography variant="body2" sx={{ color: PALETTE.textSecondary, mt: 0.5 }}>
              Hỏi bằng giọng nói hoặc tin nhắn
            </Typography>
          </Box>

          <Box
            ref={chatBoxRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 3,
              py: 1,
              minHeight: 220,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {chats.length === 0 ? (
              <Typography variant="body2" sx={{ color: PALETTE.textMuted, textAlign: 'center', py: 4 }}>
                Bắt đầu cuộc trò chuyện với trợ lý Czen
              </Typography>
            ) : null}
            {chats.map((chat, i) => (
              <Box
                key={i}
                sx={{
                  maxWidth: '85%',
                  alignSelf: chat.who === 'me' ? 'flex-end' : 'flex-start',
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: chat.who === 'me' ? PALETTE.chipBg : PALETTE.surfaceVariant,
                  color: PALETTE.textPrimary,
                }}
              >
                <Typography variant="body2">{chat.msg}</Typography>
              </Box>
            ))}
            {stubLoading ? (
              <Typography variant="caption" sx={{ color: PALETTE.textMuted, px: 1 }}>Đang trả lời...</Typography>
            ) : null}
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              borderTop: `1px solid ${PALETTE.border}`,
            }}
          >
            <Tooltip title={MIC_LABEL[voice.status]}>
              <IconButton
                onClick={handleMicClick}
                aria-label={MIC_LABEL[voice.status]}
                sx={{ width: 44, height: 44, color: micColor, flexShrink: 0 }}
              >
                <MicIcon />
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              size="small"
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
                e.preventDefault()
                void handleSend()
              }}
              placeholder="Nhập tin nhắn..."
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => void handleSend()} aria-label="Gửi" sx={{ width: 40, height: 40 }}>
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </CardContent>
      </SurfaceCard>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
    </>
  )
}
