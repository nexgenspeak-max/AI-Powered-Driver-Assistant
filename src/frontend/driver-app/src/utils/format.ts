export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

/** "14:30" — time only, for a pickup slot shown next to a date-less label. */
export function formatTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

/** "4,5 km" under 10 km, "12 km" above — Vietnamese decimal comma. */
export function formatKm(km?: number | null): string {
  if (km == null || !Number.isFinite(km)) return ''
  if (km >= 10) return `${Math.round(km)} km`
  return `${km.toFixed(1).replace('.', ',')} km`
}

/** "12 phút", "1 giờ 05 phút". */
export function formatMinutes(min?: number | null): string {
  if (min == null || !Number.isFinite(min)) return ''
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} phút`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} giờ` : `${h} giờ ${String(rest).padStart(2, '0')} phút`
}

/** "12 phút · 4,5 km" — one line for a trip leg. */
export function formatRoute(eta?: number, km?: number): string {
  if (!eta) return '—'
  const parts = [formatMinutes(eta), formatKm(km)].filter(Boolean)
  return parts.join(' · ')
}

export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount)
}
