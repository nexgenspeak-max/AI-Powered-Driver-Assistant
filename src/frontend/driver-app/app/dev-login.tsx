import { useEffect, useState } from 'react'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { View } from 'tamagui'
import { AppText } from '../src/components/AppText'
import { authService } from '../src/services/api/auth'
import { useAuthStore } from '../src/stores/authStore'

function firstParam(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

/**
 * DEV-only deep-link login for the simulator self-verify loop (no UI
 * automation permission needed):
 *   xcrun simctl openurl booted "driver-app://dev-login?phone=...&password=..."
 * Logs in, then lands on the app. Compiled out of production like map-preview.
 */
export default function DevLoginScreen() {
  const params = useLocalSearchParams<{ phone?: string | string[]; password?: string | string[]; to?: string | string[] }>()
  const setTokens = useAuthStore(s => s.setTokens)
  const [status, setStatus] = useState('Đang đăng nhập...')

  useEffect(() => {
    if (!__DEV__) return
    const phone = firstParam(params.phone)
    const password = firstParam(params.password)
    const to = firstParam(params.to) || '/(app)/'
    if (!phone || !password) {
      setStatus('Thiếu phone/password')
      return
    }
    authService
      .login({ role: 'driver', phone, password })
      .then(({ access_token, refresh_token }) => {
        setTokens(access_token, refresh_token)
        router.replace(to as never)
      })
      .catch(err => setStatus(`Lỗi đăng nhập: ${err?.message ?? err}`))
  }, [params.phone, params.password, params.to, setTokens])

  if (!__DEV__) return <Redirect href="/(auth)" />

  return (
    <View flex={1} alignItems="center" justifyContent="center" backgroundColor="$background">
      <AppText variant="body" color="$textSecondary">
        {status}
      </AppText>
    </View>
  )
}
