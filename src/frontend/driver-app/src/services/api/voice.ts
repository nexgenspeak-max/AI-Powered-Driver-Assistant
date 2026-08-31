import { apiClient } from './client'
import type { VoiceRoutingLang } from '../voiceLang'

export interface DriverVoiceToken {
  token: string
  room_name: string
  livekit_url: string
}

export const voiceService = {
  getDriverToken: (driverPhone: string, lang: VoiceRoutingLang) =>
    apiClient
      .post<DriverVoiceToken>('/voice/token', undefined, {
        params: { driver_phone: driverPhone, lang },
      })
      .then(r => r.data),
}
