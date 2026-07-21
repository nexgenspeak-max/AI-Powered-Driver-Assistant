import { YStack, XStack, View, Text } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSurface } from '../../../components/GlassSurface'
import { Badge } from '../../../components/Badge'
import { GlossyAvatar } from './GlossyAvatar'
import type { Driver, DriverProfile } from '../../../types'

interface Props {
  driver: Driver
  profile: DriverProfile
}

// Telegram/Nicegram-style profile: big centered avatar + name in its own
// glass card, then grouped "settings list" glass cards (icon circle ·
// label/value) instead of a stat grid.
export function ProfileCard({ driver, profile }: Props) {
  const isOnline = driver.status === 'online'

  return (
    <YStack gap="$4">
      <GlassSurface cornerRadius={20}>
        <YStack alignItems="center" gap="$2" paddingVertical="$5">
          <GlossyAvatar letter={driver.name.charAt(0).toUpperCase()} size={96} />
          <Text fontSize="$6" fontWeight="700" color="$textPrimary" marginTop="$2">
            {driver.name}
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
        <InfoRow icon="call-outline" label="Số điện thoại" value={driver.phone} />
        {!!driver.vehicle_name && (
          <>
            <Divider />
            <InfoRow icon="car-outline" label="Phương tiện" value={`${driver.vehicle_name} · ${driver.vehicle_plate}`} />
          </>
        )}
      </GlassSurface>

      <GlassSurface cornerRadius={20}>
        <InfoRow icon="star-outline" label="Đánh giá" value={profile.rating.toFixed(2)} />
        <Divider />
        <InfoRow icon="checkmark-done-outline" label="Tổng chuyến" value={String(profile.total_trips)} />
        <Divider />
        <InfoRow icon="trending-up-outline" label="Tỉ lệ nhận chuyến" value={`${profile.acceptance_rate.toFixed(0)}%`} />
        <Divider />
        <InfoRow icon="checkmark-circle-outline" label="Tỉ lệ hoàn thành" value={`${profile.completion_rate.toFixed(0)}%`} />
      </GlassSurface>
    </YStack>
  )
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$4">
      <View width={34} height={34} borderRadius={17} backgroundColor="$primaryMuted" alignItems="center" justifyContent="center">
        <Ionicons name={icon} size={16} color="#7C5B9C" />
      </View>
      <YStack flex={1}>
        <Text color="$textSecondary" fontSize={11}>
          {label}
        </Text>
        <Text color="$textPrimary" fontSize="$3" fontWeight="500">
          {value}
        </Text>
      </YStack>
    </XStack>
  )
}

function Divider() {
  return <View height={1} backgroundColor="$border" marginLeft={62} />
}
