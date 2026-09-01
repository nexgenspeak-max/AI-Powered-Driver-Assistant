import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import QuickActionCard from '../components/QuickActionCard'
import AssistantChatPanel from '../features/home/components/AssistantChatPanel'
import CustomerMapPanel from '../features/map/CustomerMapPanel'
import { useAuthStore } from '../stores/authStore'

export default function HomePage() {
  const customer = useAuthStore(s => s.customer)

  return (
    <AppShell maxWidth="lg">
      <Stack spacing={3}>
        <PageHeader
          title={`Xin chào, ${customer?.name ?? 'bạn'}`}
          subtitle="Theo dõi chuyến trên bản đồ và trò chuyện với trợ lý AI."
        />
        <CustomerMapPanel />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/booking" title="Đặt xe" description="Nhập điểm đón, điểm đến và gửi yêu cầu chuyến." icon={<LocalTaxiRoundedIcon />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/trips" title="Chuyến của tôi" description="Xem lịch sử và chuyến đang chạy." icon={<LocalTaxiRoundedIcon />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/faq" title="Câu hỏi thường gặp" description="Hướng dẫn đặt xe và theo dõi chuyến." icon={<HelpOutlineRoundedIcon />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/about" title="Giới thiệu" description="Tìm hiểu về Czen và trợ lý giọng nói." icon={<InfoOutlinedIcon />} />
              </Grid>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12, lg: 5 }}>
            <AssistantChatPanel />
          </Grid>
        </Grid>
      </Stack>
    </AppShell>
  )
}
