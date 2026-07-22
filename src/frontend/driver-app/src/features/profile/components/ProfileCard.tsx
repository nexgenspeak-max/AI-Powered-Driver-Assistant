import { Image, type ImageSourcePropType } from 'react-native'
import { YStack, XStack, View, Text, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassSurface } from '../../../components/GlassSurface'
import { Badge } from '../../../components/Badge'
import { GlossyAvatar } from './GlossyAvatar'
import type { Driver, DriverProfile } from '../../../types'

interface Props {
  driver: Driver
  profile: DriverProfile
}

// Light mode: flat, full-color icon set (assets/icons/light/) — swapped in
// for the plain Ionicons glyphs InfoRow used before. Fixed-palette raster
// images, not tintable like a vector Ionicon, so InfoRow drops its circular
// `$primaryMuted` tint wrapper for these and just sizes the image itself.
// Dark mode: single-color silhouette set (assets/icons/dark/), tinted white
// so it reads against the dark background.
const ICONS = {
  phone: require('../../../../assets/icons/light/phone-call.png') as ImageSourcePropType,
  car: require('../../../../assets/icons/light/car.png') as ImageSourcePropType,
  star: require('../../../../assets/icons/light/star-rating.png') as ImageSourcePropType,
  trips: require('../../../../assets/icons/light/bar-chart.png') as ImageSourcePropType,
  acceptance: require('../../../../assets/icons/light/thumbs-up.png') as ImageSourcePropType,
  completion: require('../../../../assets/icons/light/verified-check.png') as ImageSourcePropType,
}
const DARK_ICONS = {
  phone: require('../../../../assets/icons/dark/phone-call.png') as ImageSourcePropType,
  car: require('../../../../assets/icons/dark/car.png') as ImageSourcePropType,
  star: require('../../../../assets/icons/dark/star-rating.png') as ImageSourcePropType,
  trips: require('../../../../assets/icons/dark/bar-chart.png') as ImageSourcePropType,
  acceptance: require('../../../../assets/icons/dark/thumbs-up.png') as ImageSourcePropType,
  completion: require('../../../../assets/icons/dark/verified-check.png') as ImageSourcePropType,
}

// Telegram/Nicegram-style profile: big centered avatar + name in its own
// glass card, then grouped "settings list" glass cards (icon circle ·
// label/value) instead of a stat grid.
export function ProfileCard({ driver, profile }: Props) {
  const isOnline = driver.status === 'online'
  const isDark = useThemeName() === 'dark'

  return (
    <YStack gap="$4">
      <GlassSurface cornerRadius={20} outline>
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

      <GlassSurface cornerRadius={20} outline>
        <InfoRow icon={isDark ? DARK_ICONS.phone : ICONS.phone} isDark={isDark} label="Số điện thoại" value={driver.phone} />
        {!!driver.vehicle_name && (
          <>
            <Divider />
            <InfoRow
              icon={isDark ? DARK_ICONS.car : ICONS.car}
              isDark={isDark}
              label="Phương tiện"
              value={`${driver.vehicle_name} · ${driver.vehicle_plate}`}
            />
          </>
        )}
      </GlassSurface>

      <GlassSurface cornerRadius={20} outline>
        <InfoRow icon={isDark ? DARK_ICONS.star : ICONS.star} isDark={isDark} label="Đánh giá" value={profile.rating.toFixed(2)} />
        <Divider />
        <InfoRow
          icon={isDark ? DARK_ICONS.trips : ICONS.trips}
          isDark={isDark}
          label="Tổng chuyến"
          value={String(profile.total_trips)}
        />
        <Divider />
        <InfoRow
          icon={isDark ? DARK_ICONS.acceptance : ICONS.acceptance}
          isDark={isDark}
          label="Tỉ lệ nhận chuyến"
          value={`${profile.acceptance_rate.toFixed(0)}%`}
        />
        <Divider />
        <InfoRow
          icon={isDark ? DARK_ICONS.completion : ICONS.completion}
          isDark={isDark}
          label="Tỉ lệ hoàn thành"
          value={`${profile.completion_rate.toFixed(0)}%`}
        />
      </GlassSurface>
    </YStack>
  )
}

function InfoRow({
  icon,
  isDark,
  label,
  value,
}: {
  icon: ImageSourcePropType
  isDark: boolean
  label: string
  value: string
}) {
  return (
    <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$4">
      <Image
        source={icon}
        style={{ width: isDark ? 26 : 32, height: isDark ? 26 : 32, tintColor: isDark ? '#ffffff' : undefined }}
        resizeMode="contain"
      />
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
