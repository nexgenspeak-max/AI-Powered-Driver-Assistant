import { config } from '../config';
import { authHeaders } from './serviceToken';

/** Proxies the actual send to external-channel-service, which owns Twilio credentials. */
export async function sendSms(to: string, message: string): Promise<{ status: string; sid: string; to: string }> {
  const resp = await fetch(`${config.callCenterUrl.replace(/\/$/, '')}/api/v1/sms/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ phoneNumber: to, message }),
  });
  const data = (await resp.json()) as { error?: string; detail?: string; status: string; sid: string; to: string };
  if (!resp.ok) {
    throw new Error(data.error || data.detail || `external-channel SMS send failed (${resp.status})`);
  }
  return data;
}
