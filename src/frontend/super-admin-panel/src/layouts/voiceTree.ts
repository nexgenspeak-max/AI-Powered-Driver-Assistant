import { ROUTES } from '../constants/routes'
import type { LocaleBundle, PromptFile, ToolEntry } from '../types/ops'
import type { OpsMessages } from '../i18n/messages'
import { promptFileLabel, readVoiceQuery, voiceHref } from './voiceQuery'

export type VoiceTreeNode = {
  id: string
  label: string
  secondary?: string
  to?: string
  children?: VoiceTreeNode[]
}

export function hrefMatches(to: string, pathname: string, search: string): boolean {
  const u = new URL(to, 'http://ops.local')
  if (u.pathname !== pathname) {
    return false
  }
  const a = readVoiceQuery(u.search)
  const b = readVoiceQuery(search)
  return a.lang === b.lang && a.section === b.section && a.file === b.file
}

export function expandedIdsForHref(nodes: VoiceTreeNode[], pathname: string, search: string): string[] {
  const hit: string[] = []
  const walk = (node: VoiceTreeNode, ancestors: string[]): boolean => {
    if (node.to && hrefMatches(node.to, pathname, search)) {
      hit.push(...ancestors, node.id)
      return true
    }
    let found = false
    for (const child of node.children ?? []) {
      if (walk(child, [...ancestors, node.id])) {
        found = true
      }
    }
    return found
  }
  for (const node of nodes) {
    walk(node, [])
  }
  return [...new Set(hit)]
}

export function buildVoiceTree(
  locales: LocaleBundle[],
  tools: ToolEntry[],
  prompts: PromptFile[],
  t: OpsMessages,
): VoiceTreeNode[] {
  const missing = t.tools.missingSchema

  const featureNodes = (lang: string): VoiceTreeNode[] => {
    const langTools = lang === 'shared' ? [] : tools.filter(tool => tool.locales.includes(lang))
    const sections = [...new Set(langTools.map(tool => (tool.in_schema ? tool.section : missing)))]
    const langPrompts = prompts.filter(row => row.locale === lang)

    return [
      {
        id: `${lang}-models`,
        label: t.nav.agent.label,
        to: voiceHref(ROUTES.AGENT, { lang }),
      },
      {
        id: `${lang}-tools`,
        label: t.nav.tools.label,
        children: [
          {
            id: `${lang}-tools-all`,
            label: t.cascade.allSections,
            to: voiceHref(ROUTES.TOOLS, { lang }),
          },
          ...sections.map(section => ({
            id: `${lang}-tools-${section}`,
            label: section,
            to: voiceHref(ROUTES.TOOLS, { lang, section }),
          })),
        ],
      },
      {
        id: `${lang}-prompts`,
        label: t.nav.prompts.label,
        children: [
          {
            id: `${lang}-prompts-all`,
            label: t.cascade.allFiles,
            to: voiceHref(ROUTES.PROMPTS, { lang }),
          },
          ...langPrompts.map(row => ({
            id: row.path,
            label: promptFileLabel(row.path),
            secondary: row.path,
            to: voiceHref(ROUTES.PROMPTS, { lang, file: row.path }),
          })),
        ],
      },
    ]
  }

  const langNodes: VoiceTreeNode[] = locales.map(loc => ({
    id: loc.id,
    label: loc.id,
    secondary: loc.spoken,
    children: featureNodes(loc.id),
  }))

  if (prompts.some(row => row.locale === 'shared')) {
    langNodes.push({
      id: 'shared',
      label: t.cascade.shared,
      children: featureNodes('shared').filter(node => node.id.endsWith('-prompts')),
    })
  }

  if (langNodes.length === 0) {
    return featureNodes('')
  }
  return langNodes
}
