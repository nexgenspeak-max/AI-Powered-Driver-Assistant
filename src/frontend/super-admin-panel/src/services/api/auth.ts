import { authClient } from './authClient'
import type { AuthTokens, AuthUser } from '../../types/auth'

export const authService = {
  login: (payload: { role: 'super_admin'; email: string; password: string }) =>
    authClient.post<AuthTokens>('/auth/login', payload).then(r => r.data),

  refresh: (refresh_token: string) =>
    authClient.post<AuthTokens>('/auth/refresh', { refresh_token }).then(r => r.data),

  me: () => authClient.get<AuthUser>('/auth/me').then(r => r.data),
}
