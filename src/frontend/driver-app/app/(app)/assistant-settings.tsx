import { ScrollView, Switch } from 'react-native'
import { View, XStack, YStack, Text, useTheme, useThemeName } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { settingsService, type AccountSettings } from '../../src/services/api/settings'

type ToggleKey = 'hands_free_mode' | 'notify_on_pickup_approach' | 'auto_suggest_next_stop'

export default function AssistantSettingsScreen() {
  const insets = useSafeAreaInsets()
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
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  if (!driver) return null

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Cài đặt trợ lý
        </Text>
        <Text color="$textSecondary" fontSize={13}>
          Bật/tắt các tính năng trợ lý sẽ tự động thực hiện thay bạn. Cài đặt được lưu trên tài khoản — đăng nhập ở máy khác hoặc cài lại app vẫn giữ nguyên.
        </Text>

        <GlassSurface cornerRadius={20} outline>
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
        </GlassSurface>
      </ScrollView>
    </View>
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
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
      <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
        <View width={24} alignItems="center">
          <Ionicons name={iconName} size={20} color={theme.textSecondary.val} />
        </View>
        <YStack flex={1}>
          <Text color="$textPrimary" fontWeight="500">
            {label}
          </Text>
          <Text color="$textSecondary" fontSize={11} marginTop="$1">
            {description}
          </Text>
        </YStack>
      </XStack>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: isLight ? '#B8BCC8' : theme.borderStrong.val, true: '#8B5CF6' }}
        thumbColor="#ffffff"
        ios_backgroundColor={isLight ? '#B8BCC8' : theme.borderStrong.val}
      />
    </XStack>
  )
}
