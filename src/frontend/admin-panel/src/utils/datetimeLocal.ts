/** Bridge ISO strings (API) ↔ `datetime-local` input value (local wall clock). */

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDatetimeLocalValue(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function isoFromDatetimeLocalValue(local: string): string {
  if (!local) return ''
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

export function minDatetimeLocalValue(from: Date = new Date()): string {
  return toDatetimeLocalValue(from.toISOString())
}
