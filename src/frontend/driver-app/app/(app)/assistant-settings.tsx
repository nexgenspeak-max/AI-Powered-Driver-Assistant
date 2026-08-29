import { View, XStack, YStack, useTheme, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { Toggle } from '../../src/components/Toggle'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { settingsService, type AccountSettings } from '../../src/services/api/settings'
import { pushImmediateLocation } from '../../src/services/location/pushImmediateLocation'

type ToggleKey = 'hands_free_mode' | 'notify_on_pickup_approach' | 'auto_suggest_next_stop'

export default function AssistantSettingsScreen() {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const queryClient = useQueryClient()
  const { data: driver } = useCurrentUser()
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)

  const queryKey = ['account-settings', driver?.id]
  const { data: settings } = useQuery({
    queryKey,
    queryFn: () => settingsService.get(driver!.id),
    enabled: !!driver,
  })

  // Config lives in the DB, not on the device — every time this screen loads
  // the backend's current value wins, so a driver who logs in on a new phone
  // (or reinstalls) sees their real hands-free state, not this device's
  // local default.
  useEffect(() => {
    if (settings) setWakeWordEnabled(settings.hands_free_mode)
  }, [settings, setWakeWordEnabled])

  const { mutate: toggle } = useMutation({
    mutationFn: (payload: Partial<Record<ToggleKey, boolean>>) => settingsService.update(driver!.id, payload),
    onMutate: async payload => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<AccountSettings>(queryKey)
      if (previous) queryClient.setQueryData<AccountSettings>(queryKey, { ...previous, ...payload })
      if (payload.hands_free_mode !== undefined) setWakeWordEnabled(payload.hands_free_mode)
      return { previous }
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
      if (context?.previous) setWakeWordEnabled(context.previous.hands_free_mode)
    },
    // Writes the PATCH response straight into the cache instead of
    // invalidating + refetching — the optimistic flip in onMutate already
    // shows the right state instantly, so following it with a whole extra
    // GET round-trip just to re-confirm the same value was the "fussy"
    // extra step making the switch feel laggy. The mutation response IS the
    // confirmed server state, no second request needed to get it.
    onSuccess: (data, payload) => {
      queryClient.setQueryData(queryKey, data)
      // Turning ON either proximity-radius toggle right as the driver
      // already happens to be within range shouldn't have to wait for the
      // next scheduled ping (steady-state ~10min, see
      // useLiveDriverLocation.ts) to actually notify/suggest — fire a
      // location check immediately so runProximityChecks (drivers.ts)
      // evaluates the NEW setting against the current position right away.
      // Each toggle gets its own independent check — two separate `if`s, not
      // one `||`: each Switch's onValueChange only ever sends its own single
      // key today, but if that ever changes (e.g. a future "turn both on"
      // action bundling both keys into one payload), an `||` here would
      // collapse two toggles-just-turned-on into a single push and only one
      // of the two features would actually get checked against the current
      // position. Only fires on true (turning on) — nothing to check on
      // turning a toggle off. Fired after onSuccess (not onMutate's
      // optimistic flip) so the PATCH has actually landed server-side before
      // this location ping's own driverSettingsService.getByPhone() read can
      // see it. Each passes its own scope so this check ONLY evaluates the
      // feature just turned on — without it, turning on "gợi ý" (200m) while
      // "thông báo" (1km, wider radius) was also already on could fire the
      // notify message instead, since notify's broader radius wins whenever
      // both would qualify — confusing when testing the toggle you just
      // flipped.
      if (payload.notify_on_pickup_approach === true) pushImmediateLocation('notify')
      if (payload.auto_suggest_next_stop === true) pushImmediateLocation('suggest')
    },
  })

  if (!driver) return null

  return (
    <Screen scroll backButton>
      <AppText variant="h1">Cài đặt trợ lý</AppText>
      <AppText variant="body" color="$textSecondary">
        Bật/tắt các tính năng trợ lý sẽ tự động thực hiện thay bạn. Cài đặt được lưu trên tài khoản — đăng nhập ở máy khác hoặc cài lại app vẫn giữ nguyên.
      </AppText>

      <Surface flat>
          <ToggleRow
            iconName="mic-outline"
            label="Chế độ rảnh tay"
            description="Nghe từ khoá đánh thức ở chế độ nền để điều khiển bằng giọng nói"
            value={settings?.hands_free_mode ?? false}
            onValueChange={v => toggle({ hands_free_mode: v })}
            isLight={isLight}
            theme={theme}
          />
          <View height={1} backgroundColor="$border" />
          <ToggleRow
            iconName="call-outline"
            label="Thông báo khách khi gần điểm đón"
            description={`Tự động gọi/nhắn khách khi tài xế còn cách điểm đón dưới ${formatMeters(settings?.notify_on_pickup_approach_radius_m)}`}
            value={settings?.notify_on_pickup_approach ?? false}
            onValueChange={v => toggle({ notify_on_pickup_approach: v })}
            isLight={isLight}
            theme={theme}
          />
          <View height={1} backgroundColor="$border" />
          <ToggleRow
            iconName="navigate-outline"
            label="Tự gợi ý điểm dừng tiếp theo"
            description={`Trợ lý tự đề xuất điểm đón/trả kế tiếp khi còn cách dưới ${formatMeters(settings?.auto_suggest_next_stop_radius_m)}`}
            value={settings?.auto_suggest_next_stop ?? false}
            onValueChange={v => toggle({ auto_suggest_next_stop: v })}
            isLight={isLight}
            theme={theme}
          />
        </Surface>
    </Screen>
  )
}

function formatMeters(meters: number | undefined): string {
  if (!meters) return '—'
  return meters >= 1000 ? `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)}km` : `${meters}m`
}

function ToggleRow({
  iconName,
  label,
  description,
  value,
  onValueChange,
  isLight,
  theme,
}: {
  iconName: keyof typeof Ionicons.glyphMap
  label: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
  isLight: boolean
  theme: ReturnType<typeof useTheme>
}) {
  // Local, synchronous mirror of `value` — the native Switch widget flips
  // itself the instant it's touched, but `value` only catches up once
  // useMutation's onMutate has actually run, which React Query always defers
  // by at least one microtask (even though onMutate's own body has no real
  // async work to wait on). That gap was enough for React to re-render with
  // the still-OLD `value` in between, snapping the switch back before it
  // jumped forward again — the "flips twice" bug. Flipping this local state
  // synchronously in the same tap handler removes that gap entirely; the
  // effect below still reconciles from the real `value` (server-confirmed,
  // or rolled back on error) whenever it changes.
  const [displayValue, setDisplayValue] = useState(value)
  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  return (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4" minHeight={56}>
      <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
        <View width={24} alignItems="center">
          <Ionicons name={iconName} size={20} color={theme.textSecondary.val} />
        </View>
        <YStack flex={1}>
          <AppText variant="body">{label}</AppText>
          <AppText variant="caption" color="$textSecondary" marginTop="$1">
            {description}
          </AppText>
        </YStack>
      </XStack>
      <Toggle
        value={displayValue}
        onValueChange={v => {
          setDisplayValue(v)
          onValueChange(v)
        }}
        onColor={theme.primary.val}
        accessibilityLabel={label}
      />
    </XStack>
  )
}
