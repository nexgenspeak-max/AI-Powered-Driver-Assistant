import { apiClient } from './client'
import { authClient } from './authClient'

export interface CustomerVoiceToken {
  token: string
  room_name: string
  livekit_url: string
}

export const voiceService = {
  getCustomerToken: (customerPhone: string) =>
    apiClient
      .post<CustomerVoiceToken>('/voice/customer-token', undefined, { params: { customer_phone: customerPhone } })
      .then(r => r.data),

  getEnrollToken: (phone: string, role: 'driver' | 'customer') =>
    apiClient
      .post<CustomerVoiceToken>('/voice/enroll-token', undefined, { params: { phone, role } })
      .then(r => r.data),

  // Direct call to auth-service (not trip-service) — same self/admin-only
  // route the backend voice-agent uses to fetch the stored voiceprint.
  checkVoiceprint: (accountId: string) =>
    authClient
      .get<{ has_voiceprint: boolean }>(`/accounts/${accountId}/voiceprint`)
      .then(r => r.data.has_voiceprint),
}
