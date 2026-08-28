import { ScrollView, Share } from 'react-native'
import { View, YStack, Text } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackButton, getBackButtonClearance } from '../../src/components/BackButton'
import { Surface } from '../../src/components/Surface'
import { AppText } from '../../src/components/AppText'
import { Button } from '../../src/components/Button'
import { useCurrentUser } from '../../src/features/auth/hooks/useCurrentUser'

// Derived client-side from the account id (no referral-code endpoint on the
// backend yet) — stable for a given account since it's a slice of the id
// itself, just formatted to look like a share code.
function referralCodeFor(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export default function ReferralScreen() {
  const insets = useSafeAreaInsets()
  const { data: customer } = useCurrentUser()

  if (!customer) return null
  const code = referralCodeFor(customer.id)

  const share = () =>
    Share.share({
      message: `Tải app Czen và đặt xe cùng mình! Nhập mã giới thiệu ${code} khi đăng ký.`,
    })

  return (
    <View flex={1} backgroundColor="$surface">
      <BackButton />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: getBackButtonClearance(insets.top) + 16, paddingBottom: 100, gap: 20 }}
      >
        <AppText variant="h1">Giới thiệu bạn bè</AppText>
        <Text color="$textSecondary" lineHeight={20}>
          Chia sẻ mã của bạn với bạn bè — ưu đãi cho người giới thiệu và người được giới thiệu sẽ sớm ra mắt.
        </Text>

        <Surface>
          <YStack alignItems="center" gap="$3" padding="$6">
            <AppText variant="caption" color="$textSecondary">
              MÃ GIỚI THIỆU CỦA BẠN
            </AppText>
            <AppText variant="display" color="$textPrimary" letterSpacing={4} selectable>
              {code}
            </AppText>
            <Button label="Chia sẻ mã" onPress={share} />
          </YStack>
        </Surface>
      </ScrollView>
    </View>
  )
}
