import type { ReactNode } from 'react'
import { TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { XStack, View, useTheme } from 'tamagui'
import { Icon } from './icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText } from './AppText'

// Consistent header for pushed / detail screens (about, faq, vehicle,
// addresses…). Pairs with <Screen header={<AppBar .../>}>.
//
// NOTE: expo-router's `router.back()` can misbehave for screens registered as
// hidden tabs in the same <Tabs> navigator (no real push history to pop — see
// BackButton.tsx). Pass an explicit `onBack` for those.
//
// Duplicated in customer-app/src/components/AppBar.tsx.

export type AppBarProps = {
  title?: string
  onBack?: () => void
  right?: ReactNode
  showBack?: boolean
}

export function AppBar({ title, onBack, right, showBack = true }: AppBarProps) {
  const insets = useSafeAreaInsets()
  const theme = useTheme()
  return (
    <View
      backgroundColor="$background"
      paddingTop={insets.top}
      borderBottomWidth={1}
      borderBottomColor="$border"
    >
      <XStack height={52} alignItems="center" paddingHorizontal="$3" gap="$2">
        {showBack ? (
          <TouchableOpacity
            onPress={onBack ?? (() => router.back())}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron-left" size={26} color={theme.textPrimary.val} />
          </TouchableOpacity>
        ) : (
          <View width={40} />
        )}
        <AppText variant="h2" flex={1} numberOfLines={1}>
          {title ?? ''}
        </AppText>
        <View minWidth={40} alignItems="flex-end">
          {right}
        </View>
      </XStack>
    </View>
  )
}
