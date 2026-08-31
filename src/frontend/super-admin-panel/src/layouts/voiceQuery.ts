import { ROUTES } from '../constants/routes'

export type VoiceBrowseQuery = {
  lang: string
  section: string
  file: string
}

export function readVoiceQuery(search: string): VoiceBrowseQuery {
  const p = new URLSearchParams(search)
  return {
    lang: p.get('lang') ?? '',
    section: p.get('section') ?? '',
    file: p.get('file') ?? '',
  }
}

export function voiceHref(
  route: string,
  q: { lang?: string; section?: string; file?: string },
): string {
  const p = new URLSearchParams()
  if (q.lang) {
    p.set('lang', q.lang)
  }
  if (q.section) {
    p.set('section', q.section)
  }
  if (q.file) {
    p.set('file', q.file)
  }
  const qs = p.toString()
  return qs ? `${route}?${qs}` : route
}

export function promptFileLabel(path: string): string {
  return path.split('/').pop() ?? path
}

export const VOICE_FEATURE_ROUTES = [ROUTES.AGENT, ROUTES.TOOLS, ROUTES.PROMPTS] as const
