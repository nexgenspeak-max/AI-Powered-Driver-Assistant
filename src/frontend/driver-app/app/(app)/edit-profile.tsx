import { useState } from 'react'
import { ScrollView, Alert } from 'react-native'
import { View, YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { GlassSurface } from '../../src/components/GlassSurface'
import { GlossyAvatar } from '../../src/features/profile/components/GlossyAvatar'
import { Input } from '../../src/components/Input'
import { Button } from '../../src/components/Button'
import { authService } from '../../src/services/api/auth'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { data: driver } = useCurrentUser()
  const [name, setName] = useState(driver?.name ?? '')

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => authService.updateProfile(driver!.id, { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
      Alert.alert('Đã lưu', 'Hồ sơ của bạn đã được cập nhật.')
    },
    onError: () => Alert.alert('Lỗi', 'Không thể lưu hồ sơ, vui lòng thử lại.'),
  })

  if (!driver) return null

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName !== driver.name

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <Text fontSize="$6" fontWeight="800" color="$textPrimary">
          Chỉnh sửa hồ sơ
        </Text>

        <YStack alignItems="center" gap="$2">
          <GlossyAvatar letter={(trimmedName || driver.name).charAt(0).toUpperCase()} size={88} />
          {/* No upload endpoint on the backend yet — avatar is always the
              name's first letter, so there's nothing to change here besides
              typing a new name above. */}
          <Text color="$textMuted" fontSize={12}>
            Ảnh đại diện lấy theo chữ cái đầu của tên
          </Text>
        </YStack>

        <GlassSurface cornerRadius={20} outline>
          <YStack padding="$4" gap="$4">
            <Input label="Tên hiển thị" value={name} onChangeText={setName} placeholder="Nhập tên của bạn" />
            <Input label="Số điện thoại" value={driver.phone} editable={false} />
            {!!driver.email && <Input label="Email" value={driver.email} editable={false} />}
          </YStack>
        </GlassSurface>

        <Button label="Lưu thay đổi" onPress={() => save()} loading={isPending} disabled={!canSave} full />
      </ScrollView>
    </View>
  )
}
