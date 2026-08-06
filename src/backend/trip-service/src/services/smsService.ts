import { config } from '../config';

/** Proxies the actual send to call-center, which owns the Twilio credentials. */
export async function sendSms(to: string, message: string): Promise<{ status: string; sid: string; to: string }> {
  const resp = await fetch(`${config.callCenterUrl.replace(/\/$/, '')}/api/v1/sms/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: to, message }),
  });
  const data = (await resp.json()) as { error?: string; detail?: string; status: string; sid: string; to: string };
  if (!resp.ok) {
    throw new Error(data.error || data.detail || `call-center SMS send failed (${resp.status})`);
  }
  return data;
}
