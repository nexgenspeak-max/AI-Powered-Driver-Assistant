import { IconButton, Tooltip } from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { useThemeStore } from '../stores/themeStore'

export default function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const mode = useThemeStore(s => s.mode)
  const toggle = useThemeStore(s => s.toggle)
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'} placement={collapsed ? 'right' : 'top'}>
      <IconButton onClick={toggle} aria-label="Đổi giao diện sáng/tối" sx={{ width: 44, height: 44 }}>
        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  )
}
