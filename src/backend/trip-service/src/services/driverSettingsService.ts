import { authServiceClient } from './authServiceClient';
import * as driverService from './driverService';

export interface AccountSettings {
  id_account: string;
  hands_free_mode: boolean;
  notify_on_pickup_approach: boolean;
  notify_on_pickup_approach_radius_m: number;
  auto_suggest_next_stop: boolean;
  auto_suggest_next_stop_radius_m: number;
  default_customer_call_mode: 'agent' | 'bridge';
}

// Resolves phone -> account id -> settings row. Deliberately NOT cached: a
// driver flipping a toggle in the app must take effect on their very next
// GPS ping, not up to config.cacheTtlSeconds later. Callers only hit this
// once per active trip per ping (~every 10 min per driver while online, see
// driverLiveLocationKey's comment) or once per status change, so the extra
// auth-service round trip is negligible. Returns null if the driver account
// can't be found — callers should then treat every feature as off, same as
// a settings row that's never been saved.
export async function getByPhone(phone: string): Promise<AccountSettings | null> {
  const driver = await driverService.get(phone);
  if (!driver) return null;

  const { data } = await authServiceClient.getSettings<AccountSettings>(driver.id);
  return data;
}
