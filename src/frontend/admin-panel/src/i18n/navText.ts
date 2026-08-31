import { ADMIN_NAV_ITEMS, type AdminNavItem } from '../layouts/navRegistry'
import { ADMIN_MESSAGES } from './messages'
import type { AdminLocale } from './localeRegistry'

export function navItemLabel(item: AdminNavItem, locale: AdminLocale): string {
  return ADMIN_MESSAGES[locale].nav[item.messageKey].label
}

export function navItemDescription(item: AdminNavItem, locale: AdminLocale): string {
  return ADMIN_MESSAGES[locale].nav[item.messageKey].description
}

export function groupLabel(groupId: AdminNavItem['group'], locale: AdminLocale): string {
  return ADMIN_MESSAGES[locale].groups[groupId]
}

/** Search matches active locale plus EN/VI labels and static keywords. */
export function filterAdminNavItems(query: string, locale: AdminLocale): AdminNavItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...ADMIN_NAV_ITEMS]

  return ADMIN_NAV_ITEMS.filter(item => {
    const en = ADMIN_MESSAGES.en.nav[item.messageKey]
    const vi = ADMIN_MESSAGES.vi.nav[item.messageKey]
    const active = ADMIN_MESSAGES[locale].nav[item.messageKey]
    return (
      active.label.toLowerCase().includes(q) ||
      active.description.toLowerCase().includes(q) ||
      en.label.toLowerCase().includes(q) ||
      vi.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    )
  })
}
