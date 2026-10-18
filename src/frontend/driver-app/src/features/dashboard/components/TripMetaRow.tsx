import { XStack, useTheme } from 'tamagui'
import { Icon, type IconName } from '../../../components/icons'
import { AppText } from '../../../components/AppText'
import { formatKm, formatMinutes, formatTime } from '../../../utils/format'

// Compact "at a glance" strip under a trip's route: distance, driving time,
// pickup slot, and a congestion note when there is one. Same row on the
// pending card, the active card and the new-trip banner so the driver reads
// every trip the same way.
export function TripMetaRow({
  distanceKm,
  etaMinutes,
  pickupTime,
  trafficNote,
}: {
  distanceKm?: number | null
  etaMinutes?: number | null
  pickupTime?: string | null
  trafficNote?: string | null
}) {
  const theme = useTheme()
  const congestion = trafficNote && !/thông thoáng/i.test(trafficNote) ? trafficNote : null
  const items: { icon: IconName; text: string; tone?: 'warning' }[] = []
  // 0 means "no route figure" (e.g. an un-geocodable or cross-country leg),
  // not a 0 km trip — showing "0,0 km · 0 phút" read as a bug.
  const km = distanceKm && distanceKm > 0 ? formatKm(distanceKm) : ''
  const min = etaMinutes && etaMinutes > 0 ? formatMinutes(etaMinutes) : ''
  if (km) items.push({ icon: 'distance', text: km })
  if (min) items.push({ icon: 'clock', text: min })
  if (pickupTime) items.push({ icon: 'calendar', text: formatTime(pickupTime) })
  if (congestion) items.push({ icon: 'warning', text: congestion, tone: 'warning' })
  if (items.length === 0) return null

  return (
    <XStack flexWrap="wrap" gap="$3" alignItems="center">
      {items.map(item => (
        <XStack key={item.icon + item.text} alignItems="center" gap={4}>
          <Icon
            name={item.icon}
            size={14}
            color={item.tone === 'warning' ? theme.warning.val : theme.textMuted.val}
          />
          <AppText
            variant="label"
            color={item.tone === 'warning' ? '$warning' : '$textSecondary'}
            numberOfLines={1}
          >
            {item.text}
          </AppText>
        </XStack>
      ))}
    </XStack>
  )
}
