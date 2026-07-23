import { Image } from 'react-native'
import { YStack, XStack, View, Text, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSurface } from '../../../components/GlassSurface'
import { Badge } from '../../../components/Badge'
import { GlossyAvatar } from './GlossyAvatar'
import type { Customer } from '../../../types'

interface Props {
  customer: Customer
}

// Light mode: flat, full-color icon (assets/icons/light/phone-call.png).
// Dark mode: single-color silhouette (assets/icons/dark/), tinted white so
// it reads against the dark background — the light-mode asset has no such
// treatment since it's already a multi-color illustration.
const PHONE_ICON = require('../../../../assets/icons/light/phone-call.png')
const PHONE_ICON_DARK = require('../../../../assets/icons/dark/phone-call.png')

// Telegram/Nicegram-style profile: big centered avatar + name in its own
// glass card, then a separate glass card for the phone number row.
export function ProfileCard({ customer }: Props) {
  const isOnline = customer.status === 'online'
  const isDark = useThemeName() === 'dark'

  return (
    <YStack gap="$4">
      <GlassSurface cornerRadius={20}>
        <YStack alignItems="center" gap="$2" paddingVertical="$5">
          <GlossyAvatar letter={customer.name.charAt(0).toUpperCase()} size={96} />
          <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginTop="$2">
            {customer.name}
          </Text>
          {/* Plain wrapper neutralizes Badge's own `alignSelf: flex-start`
              (meant for inline row usage elsewhere) so it centers here
              instead of sticking to the left edge under the centered name. */}
          <View>
            <Badge
              label={isOnline ? 'ONLINE' : 'OFFLINE'}
              backgroundColor={isOnline ? '$successContainer' : '$primaryMuted'}
              color={isOnline ? '$onSuccessContainer' : '$textPrimary'}
              icon={<Ionicons name="ellipse" size={7} color={isOnline ? '#34d399' : '#7C5B9C'} />}
            />
          </View>
        </YStack>
      </GlassSurface>

      <GlassSurface cornerRadius={20}>
        <Text
          color="$textSecondary"
          fontSize={12}
          fontWeight="700"
          paddingHorizontal="$4"
          paddingTop="$4"
          paddingBottom="$1"
        >
          Thông tin liên hệ
        </Text>
        <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$4">
          <Image
            source={isDark ? PHONE_ICON_DARK : PHONE_ICON}
            style={{ width: isDark ? 26 : 32, height: isDark ? 26 : 32, tintColor: isDark ? '#ffffff' : undefined }}
            resizeMode="contain"
          />
          <YStack flex={1}>
            <Text color="$textSecondary" fontSize={11}>
              Số điện thoại
            </Text>
            <Text color="$textPrimary" fontSize="$3" fontWeight="500">
              {customer.phone}
            </Text>
          </YStack>
        </XStack>
      </GlassSurface>
    </YStack>
  )
}
