import twilio from 'twilio';
import { config } from '../config';
import * as twilioMonitor from './twilioMonitor';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwilioClient = any;
let clientOverride: TwilioClient | null = null;

/** Test hook: replace the Twilio client (null restores the real one). */
export function __setTwilioClientForTest(client: TwilioClient | null): void {
  clientOverride = client;
}

function getClient(): TwilioClient {
  if (clientOverride) return clientOverride;
  return twilio(config.twilioAccountSid, config.twilioAuthToken);
}

/** Error from Twilio with its numeric code (e.g. 21211 invalid To, 21408 geo permission, 21608 trial). */
export class SmsSendError extends Error {
  constructor(message: string, readonly code?: number | string, readonly httpStatus?: number) {
    super(message);
    this.name = 'SmsSendError';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callToDict(call: any) {
  return {
    sid: call.sid,
    to: call.to,
    from: call.from,
    status: call.status,
    direction: call.direction,
    duration: call.duration,
    start_time: call.startTime ? String(call.startTime) : null,
    end_time: call.endTime ? String(call.endTime) : null,
    price: call.price,
    answered_by: call.answeredBy ?? null,
  };
}

export async function makeOutboundCall(toNumber: string): Promise<string> {
  const call = await getClient().calls.create({
    to: toNumber,
    from: config.twilioPhoneNumber,
    url: `${config.baseUrl}/api/v1/calls/outbound/twiml`,
    statusCallback: `${config.baseUrl}/api/v1/calls/outbound/status`,
    statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  });
  await twilioMonitor.logEvent('api_dial', {
    CallSid: call.sid,
    To: toNumber,
    From: config.twilioPhoneNumber,
    CallStatus: call.status,
    direction: 'outbound-api',
  });
  return call.sid;
}

export async function getCallStatus(callSid: string) {
  const call = await getClient().calls(callSid).fetch();
  return callToDict(call);
}

export async function listCalls(limit = 50, direction?: string, status?: string) {
  const params: Record<string, unknown> = { limit: Math.min(limit, 100) };
  if (direction) params.direction = direction;
  if (status) params.status = status;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = await getClient().calls.list(params as any);
  return calls.map(callToDict);
}

export async function sendSms(to: string, body: string): Promise<{ sid: string; to: string; status: string }> {
  if (!/^\+[1-9]\d{7,14}$/.test(to)) {
    throw new SmsSendError(`"to" must be an E.164 number`, 'INVALID_TO', 400);
  }
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioSmsFrom) {
    throw new SmsSendError('Twilio is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM or TWILIO_PHONE_NUMBER)', 'CONFIG', 500);
  }
  // Delivery receipts (queued → sent → delivered / undelivered / failed) arrive on
  // POST /api/v1/sms/status — only when BASE_URL is a public URL Twilio can reach.
  const statusCallback = config.baseUrl.startsWith('https://') ? `${config.baseUrl}/api/v1/sms/status` : undefined;
  let message;
  try {
    message = await getClient().messages.create({
      to,
      from: config.twilioSmsFrom,
      body,
      ...(statusCallback ? { statusCallback } : {}),
    });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    await twilioMonitor.logEvent('sms_failed', {
      To: to,
      ErrorCode: String(e?.code ?? ''),
      ErrorMessage: String(e?.message ?? err),
    });
    throw new SmsSendError(String(e?.message ?? err), e?.code, e?.status);
  }
  await twilioMonitor.logEvent('sms_sent', {
    MessageSid: message.sid,
    To: message.to,
    From: config.twilioSmsFrom,
    SmsStatus: message.status,
  });
  return { sid: message.sid, to: message.to, status: message.status };
}
