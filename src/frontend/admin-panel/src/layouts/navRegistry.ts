import type { SvgIconComponent } from '@mui/icons-material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'
import LocalTaxiOutlinedIcon from '@mui/icons-material/LocalTaxiOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import PhoneInTalkOutlinedIcon from '@mui/icons-material/PhoneInTalkOutlined'
import { ROUTES } from '../constants/routes'

export type AdminNavGroupId = 'operations' | 'people' | 'system'

export type AdminNavMessageKey =
  | 'tripBoard'
  | 'createTrip'
  | 'drivers'
  | 'customers'
  | 'callLogs'

export type AdminNavItem = {
  route: string
  messageKey: AdminNavMessageKey
  group: AdminNavGroupId
  Icon: SvgIconComponent
  /** Bilingual search tokens (EN + VI + aliases). */
  keywords: string[]
}

export const ADMIN_NAV_GROUPS: ReadonlyArray<{ id: AdminNavGroupId }> = [
  { id: 'operations' },
  { id: 'people' },
  { id: 'system' },
]

/** Single source — sidebar, page headers, layout selfcheck. Add pages here only. */
export const ADMIN_NAV_ITEMS: ReadonlyArray<AdminNavItem> = [
  {
    route: ROUTES.TRIP_BOARD,
    messageKey: 'tripBoard',
    group: 'operations',
    Icon: DashboardOutlinedIcon,
    keywords: ['trip', 'board', 'dispatch', 'status', 'chuyến', 'bảng', 'điều phối'],
  },
  {
    route: ROUTES.CREATE_TRIP,
    messageKey: 'createTrip',
    group: 'operations',
    Icon: AddCircleOutlineOutlinedIcon,
    keywords: ['create', 'book', 'new', 'trip', 'tạo', 'đặt', 'chuyến'],
  },
  {
    route: ROUTES.DRIVERS,
    messageKey: 'drivers',
    group: 'people',
    Icon: LocalTaxiOutlinedIcon,
    keywords: ['driver', 'taxi', 'online', 'tài xế', 'tx'],
  },
  {
    route: ROUTES.CUSTOMERS,
    messageKey: 'customers',
    group: 'people',
    Icon: PeopleOutlinedIcon,
    keywords: ['customer', 'rider', 'user', 'khách', 'khách hàng'],
  },
  {
    route: ROUTES.CALL_LOGS,
    messageKey: 'callLogs',
    group: 'system',
    Icon: PhoneInTalkOutlinedIcon,
    keywords: ['call', 'log', 'transcript', 'voice', 'cuộc gọi', 'nhật ký', 'thoại'],
  },
]

export const ADMIN_PROTECTED_ROUTES = ADMIN_NAV_ITEMS.map(i => i.route)

export function getAdminNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find(i => i.route === pathname)
}

/** Route → message key (titles resolved via i18n at runtime). */
export const PAGE_TITLE_KEYS: Record<string, AdminNavMessageKey> = Object.fromEntries(
  ADMIN_NAV_ITEMS.map(i => [i.route, i.messageKey]),
)
