import AppShell from '../components/AppShell'
import PageHeader from '../components/PageHeader'
import AboutContent from '../features/info/components/AboutContent'

export default function AboutPage() {
  return (
    <AppShell maxWidth="sm">
      <PageHeader title="Giới thiệu" subtitle="Về Czen và trợ lý giọng nói cho khách hàng." />
      <AboutContent />
    </AppShell>
  )
}
