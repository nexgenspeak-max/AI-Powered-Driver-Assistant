import { useState } from 'react'
import { Alert } from 'react-native'
import { YStack } from 'tamagui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../src/components/Screen'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { Skeleton } from '../../src/components/Skeleton'
import { GlossyAvatar } from '../../src/features/profile/components/GlossyAvatar'
import { Input } from '../../src/components/Input'
import { Button } from '../../src/components/Button'
import { authService } from '../../src/services/api/auth'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'

export default function EditProfileScreen() {
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

  if (!driver) {
    return (
      <Screen scroll title="Chỉnh sửa hồ sơ">
        <Skeleton height={28} width="45%" radius={8} />
        <Skeleton height={88} width={88} radius={44} />
        <Skeleton height={52} radius={16} />
        <Skeleton height={52} radius={999} />
      </Screen>
    )
  }

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0 && trimmedName !== driver.name

  return (
    <Screen scroll title="Chỉnh sửa hồ sơ">

      <YStack alignItems="center" gap="$2">
        <GlossyAvatar letter={(trimmedName || driver.name).charAt(0).toUpperCase()} size={88} />
        <AppText variant="caption" color="$textMuted">
          Ảnh đại diện lấy theo chữ cái đầu của tên
        </AppText>
      </YStack>

      <Surface flat>
        <YStack padding="$4" gap="$4">
          <Input label="Tên hiển thị" value={name} onChangeText={setName} placeholder="Nhập tên của bạn" />
          <Input label="Số điện thoại" value={driver.phone} editable={false} />
          {!!driver.email && <Input label="Email" value={driver.email} editable={false} />}
        </YStack>
      </Surface>

      <Button label="Lưu thay đổi" onPress={() => save()} loading={isPending} disabled={!canSave} full />
    </Screen>
  )
}
