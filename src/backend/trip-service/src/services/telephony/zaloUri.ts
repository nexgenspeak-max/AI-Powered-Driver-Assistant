import { normalizePhone } from './normalize';

/** ZCC outbound SIP URI host — `{AppID}.zcc.openapi.zaloapp.com`. */
export function zaloSipHost(appId: string): string {
  const id = appId.trim();
  if (!id) throw new Error('ZALO_APP_ID required for ZCC dial URI');
  return `${id}.zcc.openapi.zaloapp.com`;
}

/** Dial by Zalo UID (user interacted with OA within 30 days). */
export function buildZaloUidDialUri(uid: string, appId: string): string {
  const userId = uid.trim().replace(/\D/g, '');
  if (!userId) throw new Error('zalo UID is empty');
  return `${userId}@${zaloSipHost(appId)}`;
}

/** Dial by phone — requires prior OA call consent via Zalo API. */
export function buildZaloPhoneDialUri(phone: string, appId: string): string {
  const e164 = normalizePhone(phone);
  if (!e164) throw new Error('phone is empty');
  return `${e164}@${zaloSipHost(appId)}`;
}
