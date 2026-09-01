import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import QuickActionCard from '../components/QuickActionCard'
import AssistantChatPanel from '../features/home/components/AssistantChatPanel'
import DriverMapPanel from '../features/map/DriverMapPanel'
import { useAuthStore } from '../stores/authStore'

export default function HomePage() {
  const driver = useAuthStore(s => s.driver)!

  return (
    <AppShell maxWidth="lg">
      <Stack spacing={3}>
        <PageHeader
          title={`Xin chào, ${driver.name}`}
          subtitle="Bản đồ chuyến đang chạy và trợ lý AI trên bảng điều khiển web."
        />
        <DriverMapPanel />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/dashboard" title="Chuyến đi" description="Xem chuyến chờ xác nhận, đang chạy và lịch sử." icon={<LocalTaxiRoundedIcon />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/faq" title="Câu hỏi thường gặp" description="Hướng dẫn sử dụng và câu trả lời nhanh." icon={<HelpOutlineRoundedIcon />} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <QuickActionCard to="/about" title="Giới thiệu" description="Tìm hiểu về Czen Driver và trợ lý giọng nói." icon={<InfoOutlinedIcon />} />
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
