import { ImageBackground, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { XStack, YStack, useThemeName } from 'tamagui'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { GlassButton } from '../../../components/GlassButton'
import { AppText } from '../../../components/AppText'
import { ThemeToggle } from '../../../components/ThemeToggle'
import { authGlassTheme } from '../../../theme'
import { layoutBackground } from '../../../theme/layoutAssets'
import { useThemeStore } from '../../../stores/themeStore'
import { LandingHero } from './LandingHero'

export function LandingScreen() {
  const isLight = useThemeName() === 'light'
  const insets = useSafeAreaInsets()
  const themeMode = useThemeStore(s => s.mode)
  const toggleTheme = useThemeStore(s => s.toggle)
  const titleColor = isLight ? authGlassTheme.titleColor.light : authGlassTheme.titleColor.dark
  const registerBorder = authGlassTheme.linkColor
  const registerBg = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.06)'
  // Scrim keeps body/title readable over the illustration in both themes.
  const scrimColors = isLight
    ? (['rgba(245,244,248,0.55)', 'rgba(245,244,248,0.82)', 'rgba(245,244,248,0.94)'] as const)
    : (['rgba(18,18,18,0.35)', 'rgba(18,18,18,0.72)', 'rgba(18,18,18,0.92)'] as const)

  return (
    <>
      <StatusBar style={isLight ? 'dark' : 'light'} />
      <View style={styles.root}>
        <ImageBackground
          source={layoutBackground('landing', isLight ? 'light' : 'dark')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={[...scrimColors]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

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
            <LandingHero />

            <YStack alignItems="center" gap="$3" paddingHorizontal="$2">
              <AppText variant="display" color={titleColor} textAlign="center">
                Czen
              </AppText>
              <AppText variant="h1" color="$primary" textAlign="center">
                Trợ lý AI kết nối cuộc gọi
              </AppText>
              <AppText variant="body" color="$textSecondary" textAlign="center">
                Đặt xe và liên hệ tài xế bằng giọng nói — trợ lý AI gọi giúp bạn khi cần.
              </AppText>
            </YStack>
          </YStack>

          <YStack gap="$4" width="100%">
            <GlassButton
              label="Đăng nhập"
              colors={authGlassTheme.cta.gradient}
              onPress={() => router.push('/login')}
            />
            <TouchableOpacity
              onPress={() => router.push('/register')}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Đăng ký"
              style={{
                minHeight: 52,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: registerBorder,
                backgroundColor: registerBg,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 20,
              }}
            >
              <AppText variant="title" color="$primary">
                Đăng ký
              </AppText>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
})
