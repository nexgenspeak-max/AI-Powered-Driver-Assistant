import { apiClient } from './client'

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
}
