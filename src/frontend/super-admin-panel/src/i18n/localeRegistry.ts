/**
 * Super Admin UI chrome locale registry.
 * Add a locale: append one entry here and matching keys in messages.ts — the picker menu updates automatically.
 */

export type OpsLocale = 'vi' | 'en'

export type OpsLocaleDefinition = {
  code: OpsLocale
  shortLabel: string
  nativeLabel: string
  flagCountry: string
}

export function countryCodeToFlagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 - 65 + c.charCodeAt(0)))
}

export const OPS_LOCALE_REGISTRY = {
  vi: {
    code: 'vi',
    shortLabel: 'VI',
    nativeLabel: 'Tiếng Việt',
    flagCountry: 'VN',
  },
  en: {
    code: 'en',
    shortLabel: 'EN',
    nativeLabel: 'English',
    flagCountry: 'US',
  },
} as const satisfies Record<OpsLocale, OpsLocaleDefinition>

export const OPS_LOCALE_LIST: ReadonlyArray<OpsLocaleDefinition> = [
  OPS_LOCALE_REGISTRY.vi,
  OPS_LOCALE_REGISTRY.en,
]

export const DEFAULT_OPS_LOCALE: OpsLocale = 'vi'

export function isOpsLocale(value: unknown): value is OpsLocale {
  return typeof value === 'string' && value in OPS_LOCALE_REGISTRY
}

export function getOpsLocaleDefinition(id: OpsLocale): OpsLocaleDefinition {
  return OPS_LOCALE_REGISTRY[id]
}
