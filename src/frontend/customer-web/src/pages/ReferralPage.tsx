import { useState } from 'react'
import { Button, CardContent, Stack, Typography } from '@mui/material'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import SurfaceCard from '../components/SurfaceCard'
import { useCurrentUser } from '../features/auth/hooks/useCurrentUser'
import { primaryButtonSx } from '../styles/forms'
import { PALETTE } from '../styles/palette'

function referralCodeFor(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export default function ReferralPage() {
  const { data: customer } = useCurrentUser()
  const [copied, setCopied] = useState(false)

  if (!customer) return null

  const code = referralCodeFor(customer.id)
  const shareMessage = `Tải app Czen và đặt xe cùng mình! Nhập mã giới thiệu ${code} khi đăng ký.`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareMessage })
        return
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(shareMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell maxWidth="sm">
      <PageHeader
        title="Giới thiệu bạn bè"
        subtitle="Chia sẻ mã của bạn với bạn bè — ưu đãi cho người giới thiệu và người được giới thiệu sẽ sớm ra mắt."
      />

      <SurfaceCard>
        <CardContent sx={{ p: { xs: 4, sm: 5 }, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: PALETTE.textSecondary, fontWeight: 700, letterSpacing: 1 }}>
            MÃ GIỚI THIỆU CỦA BẠN
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, letterSpacing: 4, my: 2, color: PALETTE.textPrimary }}
          >
            {code}
          </Typography>
          <Button variant="contained" size="large" onClick={() => void handleShare()} sx={primaryButtonSx}>
            {copied ? 'Đã sao chép!' : 'Chia sẻ mã'}
          </Button>
        </CardContent>
      </SurfaceCard>

      <Stack spacing={1} sx={{ mt: 3 }}>
        <Typography variant="body2" sx={{ color: PALETTE.textSecondary }}>
          Mã giới thiệu được tạo từ tài khoản của bạn và không thay đổi.
        </Typography>
      </Stack>
    </AppShell>
  )
}
