import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import LocalTaxiRoundedIcon from '@mui/icons-material/LocalTaxiRounded'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import PersonIcon from '@mui/icons-material/Person'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded'

export type NavItem = {
  to: string
  label: string
  icon: typeof HomeRoundedIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/',          label: 'Trang chủ',         icon: HomeRoundedIcon },
  { to: '/dashboard', label: 'Chuyến đi',          icon: LocalTaxiRoundedIcon },
  { to: '/earnings',  label: 'Thu nhập',           icon: AttachMoneyIcon },
  { to: '/profile',   label: 'Hồ sơ',              icon: PersonIcon },
  { to: '/about',     label: 'Giới thiệu',         icon: InfoOutlinedIcon },
  { to: '/faq',       label: 'Câu hỏi thường gặp', icon: HelpOutlineRoundedIcon },
]
