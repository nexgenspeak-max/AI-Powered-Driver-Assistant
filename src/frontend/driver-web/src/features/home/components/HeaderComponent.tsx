import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Box, IconButton, Switch, Tooltip, Typography } from "@mui/material"
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"
import LogoutIcon from "@mui/icons-material/Logout"
import { useAuthStore } from "../../../stores/authStore"
import { driversService } from "../../../services/api/drivers"
import { PALETTE } from "../../../styles/palette"

export default function HeaderComponent() {
  const driver = useAuthStore(s => s.driver)!
  const setDriver = useAuthStore(s => s.setDriver)
  const logout = useAuthStore(s => s.logout)
  const qc = useQueryClient()

  const isOnline = driver.status === 'online'

  const { mutate: toggleOnline } = useMutation({
    mutationFn: (online: boolean) =>
      driversService.update(driver.phone, { status: online ? 'online' : 'offline' }),
    onSuccess: d => { setDriver(d); qc.invalidateQueries({ queryKey: ['trips', 'driver'] }) },
  })

  const iconBtnSx = {
    width: 40, height: 40, bgcolor: '#fff', color: PALETTE.base,
    border: `1px solid ${PALETTE.mid}33`,
    boxShadow: `0 2px 6px ${PALETTE.base}12`,
    transition: 'all 0.15s ease',
    '&:hover': { bgcolor: PALETTE.pale, borderColor: PALETTE.light, transform: 'translateY(-1px)', boxShadow: `0 4px 10px ${PALETTE.base}1f` },
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 }, px: { xs: 2, sm: 3 }, py: 1.5,
      bgcolor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
      boxShadow: `0 2px 12px ${PALETTE.base}14`, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexShrink: 0 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${PALETTE.light} 0%, ${PALETTE.base} 100%)`,
          boxShadow: `0 4px 10px ${PALETTE.base}40`,
        }}>
          <DirectionsCarIcon sx={{ color: '#fff', fontSize: 21 }} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: '-0.01em', color: PALETTE.ink, display: { xs: 'none', sm: 'block' } }}>
          Czen Driver
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: `linear-gradient(135deg, ${PALETTE.base} 0%, ${PALETTE.mid} 100%)`,
        }}>
          <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>
            {driver.name.charAt(0).toUpperCase()}
          </Typography>
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: PALETTE.ink, fontSize: 14, lineHeight: 1.3 }} noWrap>
            {driver.name}
          </Typography>
          <Typography variant="caption" sx={{ color: PALETTE.gray }}>{driver.phone}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mr: 0.5 }}>
          <Typography variant="caption" sx={{ color: isOnline ? PALETTE.base : PALETTE.gray, fontWeight: 700 }}>
            {isOnline ? 'Online' : 'Offline'}
          </Typography>
          <Switch
            checked={isOnline}
            onChange={e => toggleOnline(e.target.checked)}
            sx={{
              '& .MuiSwitch-thumb': { bgcolor: isOnline ? PALETTE.base : undefined },
              '& .MuiSwitch-track': { bgcolor: isOnline ? `${PALETTE.light}` : undefined, opacity: isOnline ? 1 : undefined },
            }}
          />
        </Box>

        <Tooltip title="Đăng xuất">
          <IconButton onClick={logout} sx={iconBtnSx}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}
