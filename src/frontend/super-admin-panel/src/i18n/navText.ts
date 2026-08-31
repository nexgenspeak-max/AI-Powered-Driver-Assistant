import { OPS_NAV_ITEMS, type OpsNavItem } from '../layouts/navRegistry'
import { OPS_MESSAGES } from './messages'
import type { OpsLocale } from './localeRegistry'

export function navItemLabel(item: OpsNavItem, locale: OpsLocale): string {
  return OPS_MESSAGES[locale].nav[item.messageKey].label
}

export function navItemDescription(item: OpsNavItem, locale: OpsLocale): string {
  return OPS_MESSAGES[locale].nav[item.messageKey].description
}

export function groupLabel(groupId: OpsNavItem['group'], locale: OpsLocale): string {
  return OPS_MESSAGES[locale].groups[groupId]
}

export function filterOpsNavItems(query: string, locale: OpsLocale): OpsNavItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...OPS_NAV_ITEMS]

  return OPS_NAV_ITEMS.filter(item => {
    const en = OPS_MESSAGES.en.nav[item.messageKey]
    const vi = OPS_MESSAGES.vi.nav[item.messageKey]
    const active = OPS_MESSAGES[locale].nav[item.messageKey]
    return (
      active.label.toLowerCase().includes(q) ||
      active.description.toLowerCase().includes(q) ||
      en.label.toLowerCase().includes(q) ||
      vi.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    )
  })
}
