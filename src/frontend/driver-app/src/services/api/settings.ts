import { authClient } from './authClient'

export type CustomerCallMode = 'agent' | 'bridge'

export interface AccountSettings {
  id_account: string
  hands_free_mode: boolean
  notify_on_pickup_approach: boolean
  notify_on_pickup_approach_radius_m: number
  auto_suggest_next_stop: boolean
  auto_suggest_next_stop_radius_m: number
  default_customer_call_mode: CustomerCallMode
  updated_at: string
  updated_by: string
}

export const settingsService = {
  get: (accountId: string) =>
    authClient.get<AccountSettings>(`/settings/${accountId}`).then(r => r.data),

  update: (accountId: string, payload: Partial<Pick<AccountSettings,
    | 'hands_free_mode'
    | 'notify_on_pickup_approach'
    | 'notify_on_pickup_approach_radius_m'
    | 'auto_suggest_next_stop'
    | 'default_customer_call_mode'
  >>) =>
    authClient.patch<AccountSettings>(`/settings/${accountId}`, payload).then(r => r.data),
}
