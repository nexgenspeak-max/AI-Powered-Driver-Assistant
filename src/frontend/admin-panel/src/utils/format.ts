export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatRoute(etaMinutes?: number, distanceKm?: number): string {
  if (!etaMinutes) return '—'
  return `${etaMinutes} min · ${distanceKm} km`
}

export function capitalizeStatus(status: string): string {
  return status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
}
