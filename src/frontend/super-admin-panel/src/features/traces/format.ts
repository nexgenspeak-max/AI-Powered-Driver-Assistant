export const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace'

export function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—'
  return ms >= 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`
}

export function fmtDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '—'
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Local clock time with seconds, from epoch ms. */
export function fmtClock(epochMs: number, locale: string): string {
  return new Date(epochMs).toLocaleTimeString(locale === 'vi' ? 'vi-VN' : 'en-GB', { hour12: false })
}

export function fmtDateTime(epochMs: number, locale: string): string {
  return new Date(epochMs).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-GB', { hour12: false })
}

/** `+12.3s` since the session started. */
export function fmtOffset(ts: number, startTs: number | undefined): string {
  return startTs === undefined ? '' : `+${Math.max(0, ts - startTs).toFixed(1)}s`
}

/** `GET /trips 200` style one-liner from an op event's fields (http and friends). */
export function opSummary(op: { fields?: Record<string, unknown> }): string {
  const f = op.fields ?? {}
  return [f.method, f.path, f.status, f.error]
    .filter(v => v !== undefined && v !== null && v !== '')
    .map(String)
    .join(' ')
}

/** JSON strings (tool arguments/outputs) are parsed so they pretty-print too. */
export function prettyJson(value: unknown): string {
  if (typeof value === 'string') {
    const text = value.trim()
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        return JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        return value
      }
    }
    return value
  }
  if (value === undefined) return ''
  return JSON.stringify(value, null, 2)
}
