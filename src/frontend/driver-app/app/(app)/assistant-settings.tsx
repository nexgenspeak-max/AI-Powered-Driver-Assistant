import { View } from 'react-native'
import { XStack, YStack, useTheme, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { Skeleton } from '../../src/components/Skeleton'
import { Toggle } from '../../src/components/Toggle'
import { VoiceLocalePicker } from '../../src/features/assistant-settings/components/VoiceLocalePicker'
import { CustomerCallModePicker } from '../../src/features/assistant-settings/components/CustomerCallModePicker'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'
import { useWakeWordSettingsStore } from '../../src/features/assistant-wakeword/wakeWordSettingsStore'
import { useVoiceLangStore } from '../../src/services/voiceLang'
import { settingsService, type AccountSettings, type CustomerCallMode } from '../../src/services/api/settings'
import { pushImmediateLocation } from '../../src/services/location/pushImmediateLocation'

type ToggleKey = 'hands_free_mode' | 'notify_on_pickup_approach' | 'auto_suggest_next_stop'

export default function AssistantSettingsScreen() {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const queryClient = useQueryClient()
  const { data: driver } = useCurrentUser()
  const setWakeWordEnabled = useWakeWordSettingsStore(s => s.setEnabled)
  const voiceLang = useVoiceLangStore(s => s.lang)
  const setVoiceLang = useVoiceLangStore(s => s.setLang)

  const queryKey = ['account-settings', driver?.id]
  const { data: settings } = useQuery({
    queryKey,
    queryFn: () => settingsService.get(driver!.id),
    enabled: !!driver,
  })

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
    onSuccess: (data, payload) => {
      queryClient.setQueryData(queryKey, data)
      if (payload.notify_on_pickup_approach === true) pushImmediateLocation('notify')
      if (payload.auto_suggest_next_stop === true) pushImmediateLocation('suggest')
    },
  })

  const { mutate: setCallMode } = useMutation({
    mutationFn: (mode: CustomerCallMode) =>
      settingsService.update(driver!.id, { default_customer_call_mode: mode }),
    onMutate: async mode => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<AccountSettings>(queryKey)
      if (previous) {
        queryClient.setQueryData<AccountSettings>(queryKey, {
          ...previous,
          default_customer_call_mode: mode,
        })
      }
      return { previous }
    },
    onError: (_err, _mode, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSuccess: data => queryClient.setQueryData(queryKey, data),
  })

  if (!driver) {
    return (
      <Screen scroll backButton>
        <Skeleton height={28} width="50%" radius={8} />
        <Skeleton height={48} radius={12} />
        <Skeleton height={160} radius={24} />
        <Skeleton height={120} radius={24} />
      </Screen>
    )
  }

  return (
    <Screen scroll backButton>
      <AppText variant="h1">Cài đặt trợ lý</AppText>
      <AppText variant="body" color="$textSecondary">
        Bật/tắt các tính năng trợ lý sẽ tự động thực hiện thay bạn. Cài đặt được lưu trên tài khoản — đăng nhập ở máy khác hoặc cài lại app vẫn giữ nguyên.
      </AppText>

      <YStack gap="$2">
        <AppText variant="body" color="$textSecondary">
          Chọn ngôn ngữ Trợ lý nói và hiểu. Áp dụng từ lần kết nối tiếp theo.
        </AppText>

        <Surface flat>
          <VoiceLocalePicker value={voiceLang} onChange={setVoiceLang} />
          <View style={{ height: 1, backgroundColor: theme.border.val }} />
          <CustomerCallModePicker
            value={settings?.default_customer_call_mode ?? 'agent'}
            onChange={setCallMode}
          />
          <View style={{ height: 1, backgroundColor: theme.border.val }} />
          <ToggleRow
            iconName="mic-outline"
            label="Chế độ rảnh tay"
            description="Nghe từ khoá đánh thức ở chế độ nền để điều khiển bằng giọng nói"
            value={settings?.hands_free_mode ?? false}
            onValueChange={v => toggle({ hands_free_mode: v })}
            isLight={isLight}
            theme={theme}
          />
          <View style={{ height: 1, backgroundColor: theme.border.val }} />
          <ToggleRow
            iconName="call-outline"
            label="Thông báo khách khi gần điểm đón"
            description={`Tự động gọi/nhắn khách khi tài xế còn cách điểm đón dưới ${formatMeters(settings?.notify_on_pickup_approach_radius_m)}`}
            value={settings?.notify_on_pickup_approach ?? false}
            onValueChange={v => toggle({ notify_on_pickup_approach: v })}
            isLight={isLight}
            theme={theme}
          />
          <View style={{ height: 1, backgroundColor: theme.border.val }} />
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
      </YStack>
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
  const [displayValue, setDisplayValue] = useState(value)
  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  return (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4" minHeight={56}>
      <XStack alignItems="center" gap="$3" flex={1} paddingRight="$3">
        <View style={{ width: 24, alignItems: 'center' }}>
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
