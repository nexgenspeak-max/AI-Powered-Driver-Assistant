import { cacheGet, cacheSet } from '../../cache/redis';
import { config } from '../../config';
import { normalizePhone } from '../telephony/normalize';
import { getLogger } from '../logger';

const log = getLogger('zalo');

const CONSENT_TTL_SECONDS = 30 * 24 * 60 * 60;

function consentKey(phone: string): string {
  return `zalo:call-consent:${normalizePhone(phone)}`;
}

export interface ConsentRequestResult {
  ok: boolean;
  message: string;
  cached?: boolean;
}

/** POST openapi.zalo.me/v2.0/oa/call/requestconsent — user has 24h to accept. */
export async function requestCallConsent(phone: string): Promise<ConsentRequestResult> {
  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false, message: 'phone is empty' };

  const cached = await cacheGet<{ granted?: boolean }>(consentKey(normalized));
  if (cached?.granted) {
    return { ok: true, message: 'consent already granted', cached: true };
  }

  if (!config.zaloAccessToken) {
    log.warning('ZALO_ACCESS_TOKEN unset — consent request skipped (local dev)');
    return { ok: false, message: 'ZALO_ACCESS_TOKEN not configured' };
  }

  const resp = await fetch('https://openapi.zalo.me/v2.0/oa/call/requestconsent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      access_token: config.zaloAccessToken,
    },
    body: JSON.stringify({
      phone: normalized.replace(/^\+/, ''),
      call_type: 'audio',
      reason_code: config.zaloConsentReasonCode,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const body = (await resp.json()) as { error?: number; message?: string };
  if (!resp.ok || (body.error !== undefined && body.error !== 0)) {
    log.warning('zalo consent request failed', { status: resp.status, body: body.message });
    return { ok: false, message: body.message || `Zalo API error ${resp.status}` };
  }

  await cacheSet(
    consentKey(normalized),
    { granted: false, requested_at: new Date().toISOString() },
    CONSENT_TTL_SECONDS,
  );
  return { ok: true, message: 'consent request sent — user has 24h to accept on Zalo' };
}

/** Mark consent granted (webhook/manual confirm) or read cache. */
export async function markCallConsentGranted(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  await cacheSet(
    consentKey(normalized),
    { granted: true, granted_at: new Date().toISOString() },
    CONSENT_TTL_SECONDS,
  );
}

export async function hasCallConsent(phone: string): Promise<boolean> {
  if (config.zaloSkipConsentCheck) return true;
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const cached = await cacheGet<{ granted?: boolean }>(consentKey(normalized));
  return !!cached?.granted;
}
