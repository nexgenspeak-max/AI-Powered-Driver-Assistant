import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AuthScreenBackground } from '../../../components/AuthScreenBackground'
import { XStack, YStack, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { GlassButton } from '../../../components/GlassButton'
import { Button } from '../../../components/Button'
import { AppText } from '../../../components/AppText'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { authGlassTheme } from '../../../theme'
import { useThemeStore } from '../../../stores/themeStore'
import { BrandHero } from './BrandHero'

export function LandingScreen() {
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)
  const titleColor = isLight ? authGlassTheme.titleColor.light : authGlassTheme.titleColor.dark

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <AuthScreenBackground>

        <YStack
          flex={1}
          paddingHorizontal="$5"
          paddingTop={insets.top + 16}
          paddingBottom={Math.max(insets.bottom, 24)}
          justifyContent="space-between"
          maxWidth={authGlassTheme.card.maxWidth}
          width="100%"
          alignSelf="center"
        >
          <XStack justifyContent="flex-end" minHeight={44} alignItems="center">
            <ThemeToggle isDark={themeMode === 'dark'} onToggle={toggleTheme} />
          </XStack>

          <YStack alignItems="center" gap="$6" flex={1} justifyContent="center">
            <BrandHero />

            <YStack alignItems="center" gap="$2" paddingHorizontal="$2">
              <AppText variant="display" color={titleColor} textAlign="center">
                Czen
              </AppText>
              <AppText variant="h2" color="$primary" textAlign="center">
                Trợ lý giọng nói cho tài xế
              </AppText>
              <AppText variant="body" color="$textSecondary" textAlign="center">
                Nhận chuyến, gọi khách, xem thu nhập — chỉ cần nói, mắt vẫn trên đường.
              </AppText>
            </YStack>
          </YStack>

          <YStack gap="$4" width="100%">
            <GlassButton
              label="Đăng nhập"
              colors={authGlassTheme.cta.gradient}
              onPress={() => router.push('/login')}
            />
            <Button label="Đăng ký" variant="outline" onPress={() => router.push('/register')} />
          </YStack>
        </YStack>
      </AuthScreenBackground>
    </>
  )
}
