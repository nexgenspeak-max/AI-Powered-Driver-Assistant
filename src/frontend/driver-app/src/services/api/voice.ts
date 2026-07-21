import { apiClient } from './client'
import { authClient } from './authClient'

export interface DriverVoiceToken {
  token: string
  room_name: string
  livekit_url: string
}

export const voiceService = {
  getDriverToken: (driverPhone: string) =>
    apiClient
      .post<DriverVoiceToken>('/voice/token', undefined, { params: { driver_phone: driverPhone } })
      .then(r => r.data),

  getEnrollToken: (phone: string, role: 'driver' | 'customer') =>
    apiClient
      .post<DriverVoiceToken>('/voice/enroll-token', undefined, { params: { phone, role } })
      .then(r => r.data),

  // Direct call to auth-service (not trip-service) — same self/admin-only
  // route the backend voice-agent uses to fetch the stored voiceprint.
  checkVoiceprint: (accountId: string) =>
    authClient
      .get<{ has_voiceprint: boolean }>(`/accounts/${accountId}/voiceprint`)
      .then(r => r.data.has_voiceprint),
}
