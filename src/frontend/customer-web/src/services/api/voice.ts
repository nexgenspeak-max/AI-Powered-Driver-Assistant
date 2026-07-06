import { apiClient } from './client'

export type CustomerVoiceToken = {
  token: string
  room_name: string
  livekit_url: string
}

export const voiceService = {
  getCustomerToken: (customerPhone: string) =>
    apiClient
      .post<CustomerVoiceToken>('/voice/customer-token', undefined, { params: { customer_phone: customerPhone } })
      .then(r => r.data),
}
