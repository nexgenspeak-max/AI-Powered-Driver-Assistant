export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatRoute(eta?: number, km?: number): string {
  if (!eta) return '—'
  return `${eta} min · ${km ?? 0} km`
}
