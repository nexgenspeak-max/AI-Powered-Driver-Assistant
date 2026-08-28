import { YStack, XStack, View, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { Badge } from '../../../components/Badge'
import { GlossyAvatar } from './GlossyAvatar'
import type { Customer } from '../../../types'

interface Props {
  customer: Customer
}

export function ProfileCard({ customer }: Props) {
  const isOnline = customer.status === 'online'
  const theme = useTheme()

  return (
    <YStack gap="$4">
      <Surface alignItems="center" gap="$2" paddingVertical="$5" borderRadius={24}>
        <GlossyAvatar letter={customer.name.charAt(0).toUpperCase()} size={96} />
        <AppText variant="h1" marginTop="$2">
          {customer.name}
        </AppText>
        <View>
          <Badge
            label={isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            backgroundColor={isOnline ? '$successContainer' : '$primaryMuted'}
            color={isOnline ? '$onSuccessContainer' : '$textPrimary'}
            icon={
              <Ionicons
                name="ellipse"
                size={7}
                color={isOnline ? theme.success.val : theme.primary.val}
              />
            }
          />
        </View>
      </Surface>

      <Surface clip borderRadius={24}>
        <AppText
          variant="label"
          color="$textSecondary"
          textTransform="uppercase"
          letterSpacing={0.5}
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom="$2"
        >
          Thông tin liên hệ
        </AppText>
        <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$4">
          <View width={24} alignItems="center">
            <Ionicons name="call-outline" size={20} color={theme.textSecondary.val} />
          </View>
          <YStack flex={1}>
            <AppText variant="caption" color="$textSecondary">
              Số điện thoại
            </AppText>
            <AppText variant="body">{customer.phone}</AppText>
          </YStack>
        </XStack>
      </Surface>
    </YStack>
  )
}
