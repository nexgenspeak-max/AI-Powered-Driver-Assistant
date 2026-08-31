/**
 * Admin UI locale registry — English + Vietnamese.
 * Add a locale: append one entry; types and picker update automatically.
 */

export type AdminLocale = 'vi' | 'en'

export type AdminLocaleDefinition = {
  code: AdminLocale
  shortLabel: string
  nativeLabel: string
  flagCountry: string
}

export function countryCodeToFlagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase()
  if (code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code].map(c => 0x1f1e6 - 65 + c.charCodeAt(0)))
}

/** Ordered list — first entry is default when nothing is stored. */
export const ADMIN_LOCALE_REGISTRY = {
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
} as const satisfies Record<AdminLocale, AdminLocaleDefinition>

export const DEFAULT_ADMIN_LOCALE: AdminLocale = 'vi'

export const ADMIN_LOCALE_LIST: ReadonlyArray<{
  id: AdminLocale
  locale: AdminLocaleDefinition
}> = (Object.entries(ADMIN_LOCALE_REGISTRY) as Array<[AdminLocale, AdminLocaleDefinition]>).map(
  ([id, locale]) => ({ id, locale }),
)

export function isAdminLocale(value: unknown): value is AdminLocale {
  return typeof value === 'string' && value in ADMIN_LOCALE_REGISTRY
}

export function getAdminLocaleDefinition(id: AdminLocale): AdminLocaleDefinition {
  return ADMIN_LOCALE_REGISTRY[id]
}
