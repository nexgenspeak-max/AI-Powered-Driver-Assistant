/**
 * Voice assistant locale registry (driver-app).
 *
 * Keep routing codes in sync with:
 * - voice-agent: app/voicebot/locales/manifest.yaml
 * - trip-service: src/services/voiceLang/index.ts
 *
 * To add a language: append one entry below — types and UI update automatically.
 */

export type VoiceLocaleDefinition = {
  /** Routing code sent to POST /voice/token (`lang` query). */
  routing: string
  /** Short label for compact UI (segmented control, chips). */
  shortLabel: string
  /** Endonym — shown as primary row title in settings. */
  nativeLabel: string
  /** Secondary hint (market / dialect), UI language agnostic. */
  regionHint: string
  /** ISO 3166-1 alpha-2 — rendered as flag emoji in the picker list. */
  flagCountry: string
}

/** ISO country code → 🇻🇳 style flag (no extra asset pack). */
export function countryCodeToFlagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 - 65 + c.charCodeAt(0)))
}

/** Ordered list — first entry is the product default when nothing is stored. */
export const VOICE_LOCALE_REGISTRY = {
  vn: {
    routing: 'vn',
    shortLabel: 'VI',
    nativeLabel: 'Tiếng Việt',
    regionHint: 'Việt Nam',
    flagCountry: 'VN',
  },
  en: {
    routing: 'en',
    shortLabel: 'EN',
    nativeLabel: 'English',
    regionHint: 'English-speaking regions',
    flagCountry: 'US',
  },
} as const satisfies Record<string, VoiceLocaleDefinition>

export type VoiceRoutingLang = keyof typeof VOICE_LOCALE_REGISTRY

export const DEFAULT_VOICE_ROUTING_LANG: VoiceRoutingLang = 'vn'

/** Stable display order for pickers — same as registry declaration order. */
export const VOICE_LOCALE_LIST: ReadonlyArray<{
  id: VoiceRoutingLang
  locale: VoiceLocaleDefinition
}> = (Object.entries(VOICE_LOCALE_REGISTRY) as Array<[VoiceRoutingLang, VoiceLocaleDefinition]>).map(
  ([id, locale]) => ({ id, locale }),
)

const ROUTING_SET = new Set<string>(Object.values(VOICE_LOCALE_REGISTRY).map(l => l.routing))

export function isVoiceRoutingLang(raw: unknown): raw is VoiceRoutingLang {
  return typeof raw === 'string' && raw in VOICE_LOCALE_REGISTRY
}

/** Coerce persisted / deep-link values; unknown → default. */
export function resolveVoiceRoutingLang(raw: unknown): VoiceRoutingLang {
  if (isVoiceRoutingLang(raw)) return raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase()
    if (trimmed === 'vi' && 'vn' in VOICE_LOCALE_REGISTRY) return 'vn'
    for (const { id, locale } of VOICE_LOCALE_LIST) {
      if (locale.routing === trimmed) return id
    }
  }
  return DEFAULT_VOICE_ROUTING_LANG
}

export function getVoiceLocale(id: VoiceRoutingLang): VoiceLocaleDefinition {
  return VOICE_LOCALE_REGISTRY[id]
}

/** SegmentedControl / compact toggles — derived from registry. */
export function voiceLocaleSegmentOptions(): Array<{ value: VoiceRoutingLang; label: string }> {
  return VOICE_LOCALE_LIST.map(({ id, locale }) => ({
    value: id,
    label: locale.shortLabel,
  }))
}

/** Guard API params — only known routing codes reach trip-service. */
export function assertVoiceRoutingLang(raw: unknown): VoiceRoutingLang {
  const resolved = resolveVoiceRoutingLang(raw)
  if (!ROUTING_SET.has(VOICE_LOCALE_REGISTRY[resolved].routing)) {
    return DEFAULT_VOICE_ROUTING_LANG
  }
  return resolved
}
