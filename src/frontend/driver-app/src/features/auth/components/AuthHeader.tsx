import { Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { XStack, YStack, useTheme } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { AppText } from '../../../components/AppText'
import { CzenMark } from '../../../components/CzenMark'

const TILE = 56

// Shared top of Đăng nhập / Đăng ký: a real 44pt back button (replaces the
// "← Quay lại" text link at the bottom of the card), the brand tile, then a
// plain title + one line of context — the iOS/Material auth pattern, no
// marketing headline competing with the form.
export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme()
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(auth)'))

  return (
    <YStack width="100%" gap="$5">
      <XStack>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.chip.val }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary.val} />
        </Pressable>
      </XStack>
      <YStack gap="$3">
        <LinearGradient
          colors={['#5B21B6', '#7C3AED', '#9F67FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: TILE, height: TILE, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
        >
          <CzenMark size={34} />
        </LinearGradient>
        <YStack gap="$1">
          <AppText variant="h1" fontSize={28} lineHeight={34}>
            {title}
          </AppText>
          <AppText variant="body" color="$textSecondary">
            {subtitle}
          </AppText>
        </YStack>
      </YStack>
    </YStack>
  )
}
