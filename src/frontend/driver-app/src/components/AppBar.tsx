import type { ReactNode } from 'react'
import { Pressable, StyleSheet } from 'react-native'
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
      borderBottomWidth={StyleSheet.hairlineWidth}
      borderBottomColor="$border"
    >
      <XStack height={56} alignItems="center" paddingHorizontal="$4" gap="$3">
        {showBack ? (
          // Tonal round back button — same control as the auth header, so
          // every screen's "back" is one recognisable object, 40pt visual /
          // 48pt touch.
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.chip.val,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name="chevron-left" size={22} strokeWidth={2.4} color={theme.textPrimary.val} />
          </Pressable>
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
