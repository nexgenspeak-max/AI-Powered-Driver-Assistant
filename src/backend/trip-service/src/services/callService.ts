import { config } from '../config';

function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-()]/g, '');
  if (!p) return '';
  if (p.startsWith('00')) p = '+' + p.slice(2);
  const bare = p.replace(/^\+/, '');
  if (bare.startsWith('84')) return `+${bare}`;
  if (bare.startsWith('0') && bare.length >= 10) return `+84${bare.slice(1)}`;
  if (!p.startsWith('+')) return `+${bare}`;
  return p;
}

function resolveDialTo(customerPhone: string): [string, string | null] {
  const target = normalizePhone(customerPhone);
  if (!target) throw new Error('customer phone is empty');

  const verified = config.twilioVerifiedTo ? normalizePhone(config.twilioVerifiedTo) : '';
  if (config.callForceVerifiedTo && verified && target !== verified) {
    console.warn(`Twilio trial override: dialing ${verified} instead of customer ${target}`);
    return [verified, `Đang gọi số Twilio đã xác minh ${verified} (trên đơn ghi ${target}).`];
  }
  return [target, null];
}

export async function startCustomerCall(opts: {
  driverPhone: string;
  customerPhone: string;
  tripId: string;
  mode: string;
}) {
  if (!config.callCenterUrl) throw new Error('CALL_CENTER_URL is not set');

  const [dialTo, overrideNote] = resolveDialTo(opts.customerPhone);

  const resp = await fetch(`${config.callCenterUrl.replace(/\/$/, '')}/api/v1/calls/outbound/dial`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to_number: dialTo }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) throw new Error(`call-center unreachable at ${config.callCenterUrl}`);

  const data = await resp.json() as Record<string, unknown>;
  if (data.error) throw new Error(String(data.error));

  return {
    call_sid: data.call_sid,
    status: data.status ?? 'initiated',
    mode: opts.mode,
    dialed_number: dialTo,
    customer_phone: normalizePhone(opts.customerPhone),
    override_note: overrideNote,
    trip_id: opts.tripId,
    driver_phone: opts.driverPhone,
  };
}
