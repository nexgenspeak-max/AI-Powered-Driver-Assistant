import type { SvgIconComponent } from '@mui/icons-material'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined'
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import TerminalOutlinedIcon from '@mui/icons-material/TerminalOutlined'
import PhoneInTalkOutlinedIcon from '@mui/icons-material/PhoneInTalkOutlined'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import { ROUTES } from '../constants/routes'

export type OpsNavGroupId = 'observe' | 'agent' | 'activity'

export type OpsNavMessageKey = 'overview' | 'reports' | 'agent' | 'tools' | 'prompts' | 'logs' | 'calls'

export type OpsNavItem = {
  route: string
  messageKey: OpsNavMessageKey
  group: OpsNavGroupId
  Icon: SvgIconComponent
  keywords: string[]
}

export const OPS_NAV_GROUPS: ReadonlyArray<{ id: OpsNavGroupId }> = [
  { id: 'observe' },
  { id: 'agent' },
  { id: 'activity' },
]

export const OPS_NAV_ITEMS: ReadonlyArray<OpsNavItem> = [
  {
    route: ROUTES.OVERVIEW,
    messageKey: 'overview',
    group: 'observe',
    Icon: MonitorHeartOutlinedIcon,
    keywords: ['overview', 'health', 'status', 'tổng quan', 'sức khỏe'],
  },
  {
    route: ROUTES.REPORTS,
    messageKey: 'reports',
    group: 'observe',
    Icon: AssessmentOutlinedIcon,
    keywords: ['report', 'daily', 'latency', 'accuracy', 'báo cáo', 'ngày', 'độ trễ', 'chính xác'],
  },
  {
    route: ROUTES.AGENT,
    messageKey: 'agent',
    group: 'agent',
    Icon: SmartToyOutlinedIcon,
    keywords: ['agent', 'stt', 'llm', 'tts', 'locale', 'ai', 'cấu hình', 'mô hình'],
  },
  {
    route: ROUTES.TOOLS,
    messageKey: 'tools',
    group: 'agent',
    Icon: ConstructionOutlinedIcon,
    keywords: ['tool', 'schema', 'công cụ', 'tools_definition'],
  },
  {
    route: ROUTES.PROMPTS,
    messageKey: 'prompts',
    group: 'agent',
    Icon: ArticleOutlinedIcon,
    keywords: ['prompt', 'yaml', 'instructions', 'greeting', 'system'],
  },
  {
    route: ROUTES.LOGS,
    messageKey: 'logs',
    group: 'activity',
    Icon: TerminalOutlinedIcon,
    keywords: ['log', 'tail', 'room', 'conv', 'nhật ký'],
  },
  {
    route: ROUTES.CALLS,
    messageKey: 'calls',
    group: 'activity',
    Icon: PhoneInTalkOutlinedIcon,
    keywords: ['call', 'transcript', 'cuộc gọi', 'thoại'],
  },
]

export const OPS_PROTECTED_ROUTES = OPS_NAV_ITEMS.map(i => i.route)

export function getOpsNavItem(pathname: string): OpsNavItem | undefined {
  return OPS_NAV_ITEMS.find(i => i.route === pathname)
}

export const PAGE_TITLE_KEYS: Record<string, OpsNavMessageKey> = Object.fromEntries(
  OPS_NAV_ITEMS.map(i => [i.route, i.messageKey]),
)
