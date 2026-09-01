import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import FaqContent from '../features/info/components/FaqContent'

export default function FaqPage() {
  return (
    <AppShell maxWidth="sm">
      <PageHeader title="Câu hỏi thường gặp" subtitle="Hướng dẫn và câu trả lời nhanh cho tài xế." />
      <FaqContent />
    </AppShell>
  )
}
