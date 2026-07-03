import twilio from 'twilio';
import { config } from '../config';
import * as twilioMonitor from './twilioMonitor';

function getClient() {
  return twilio(config.twilioAccountSid, config.twilioAuthToken);
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
  twilioMonitor.logEvent('api_dial', {
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
