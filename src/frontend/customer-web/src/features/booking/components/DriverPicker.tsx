import { useQuery } from '@tanstack/react-query'
import {
  Autocomplete,
  Box,
  CircularProgress,
  FormHelperText,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { driversService } from '../../../services/api/drivers'
import { fieldSx } from '../../../styles/forms'
import { PALETTE } from '../../../styles/palette'
import type { Driver } from '../../../types'

interface Props {
  selected: Driver | null
  onSelect: (driver: Driver | null) => void
  error?: string
}

export default function DriverPicker({ selected, onSelect, error }: Props) {
  const { data: drivers, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['drivers', 'online'],
    queryFn: () => driversService.listOnline(),
  })

  return (
    <Stack spacing={1}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: PALETTE.textSecondary }}>
          Chọn tài xế *
        </Typography>
        <IconButton
          onClick={() => refetch()}
          disabled={isRefetching}
          aria-label="Làm mới danh sách tài xế"
          sx={{ width: 44, height: 44 }}
        >
          {isRefetching ? (
            <CircularProgress size={18} sx={{ color: PALETTE.primary }} />
          ) : (
            <RefreshIcon fontSize="small" sx={{ color: PALETTE.primary }} />
          )}
        </IconButton>
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} sx={{ color: PALETTE.primary }} />
        </Box>
      ) : isError ? (
        <Typography variant="body2" color="error">
          Không tải được danh sách tài xế. Thử lại sau.
        </Typography>
      ) : !drivers || drivers.length === 0 ? (
        <Box
          sx={{
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
            bgcolor: PALETTE.surfaceVariant,
            border: `1px solid ${PALETTE.border}`,
          }}
        >
          <Typography variant="body2" sx={{ color: PALETTE.textMuted }}>
            Hiện chưa có tài xế nào online. Vui lòng thử lại sau.
          </Typography>
        </Box>
      ) : (
        <Autocomplete
          options={drivers}
          value={selected}
          onChange={(_, value) => onSelect(value)}
          getOptionLabel={driver =>
            `${driver.name} — ${[driver.vehicle_type, driver.vehicle_plate].filter(Boolean).join(' · ') || driver.phone}`
          }
          isOptionEqualToValue={(a, b) => a.phone === b.phone}
          renderInput={params => (
            <TextField
              {...params}
              placeholder="Chọn tài xế online"
              sx={fieldSx}
              error={!!error}
            />
          )}
          renderOption={(props, driver) => (
            <Box component="li" {...props} key={driver.phone}>
              <Stack>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{driver.name}</Typography>
                <Typography variant="caption" sx={{ color: PALETTE.textSecondary }}>
                  {[driver.vehicle_type, driver.vehicle_plate].filter(Boolean).join(' · ') || driver.phone}
                </Typography>
              </Stack>
            </Box>
          )}
          noOptionsText="Không có tài xế online"
        />
      )}

      {error ? <FormHelperText error>{error}</FormHelperText> : null}
    </Stack>
  )
}
