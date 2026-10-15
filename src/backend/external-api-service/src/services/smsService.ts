import { config } from '../config';
import { authHeaders } from './serviceToken';
import { getLogger } from './logger';
import { resolveSmsTarget } from './sms/resolveSmsTarget';

const log = getLogger('sms');

export interface SmsSendResult {
  status: string;
  sid: string;
  to: string;
  requested_to: string;
  override_note: string | null;
}

/**
 * Proxies the actual send to external-channel-service, which owns Twilio credentials.
 * The number is normalized to E.164 here (Twilio rejects "09…" local numbers).
 * Throws SmsTargetError for an unusable number, Error for an upstream failure.
 */
/** SMS_SENDER_LABEL (e.g. "[Czen]") so the customer knows who is texting from an unknown number. */
export function withSenderLabel(message: string): string {
  const label = config.smsSenderLabel.trim();
  const body = message.trim();
  return label && !body.startsWith(label) ? `${label} ${body}` : body;
}

export async function sendSms(to: string, message: string): Promise<SmsSendResult> {
  const target = resolveSmsTarget(to);
  const body = withSenderLabel(message);
  if (!body) throw new Error('SMS message is empty');
  if (target.overrideNote) log.warning(target.overrideNote);
  const resp = await fetch(`${config.callCenterUrl.replace(/\/$/, '')}/api/v1/sms/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ phoneNumber: target.to, message: body }),
  });
  const data = (await resp.json().catch(() => ({}))) as {
    error?: string; detail?: string; code?: number | string; status?: string; sid?: string; to?: string;
  };
  if (!resp.ok) {
    const code = data.code !== undefined ? ` (Twilio ${data.code})` : '';
    throw new Error(`${data.error || data.detail || `external-channel SMS send failed (${resp.status})`}${code}`);
  }
  return {
    status: data.status || 'unknown',
    sid: data.sid || '',
    to: data.to || target.to,
    requested_to: target.requested,
    override_note: target.overrideNote,
  };
}
