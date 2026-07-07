import { authClient } from './authClient'
import type { AuthTokens } from '../../types/auth'

export const authService = {
  login: (payload: { role: 'admin'; email: string; password: string }) =>
    authClient.post<AuthTokens>('/auth/login', payload).then(r => r.data),

  refresh: (refresh_token: string) =>
    authClient.post<AuthTokens>('/auth/refresh', { refresh_token }).then(r => r.data),

  setStatus: (id: string, status: 'online' | 'offline') =>
    authClient.patch(`/accounts/${id}`, { status }).then(r => r.data),
}
