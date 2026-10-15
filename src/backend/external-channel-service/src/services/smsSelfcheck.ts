/**
 * SMS send contract with a fake Twilio client (no real message is sent).
 * Run: npm run verify:sms
 */
import { config } from '../config';
import { __setTwilioClientForTest, sendSms, SmsSendError } from './callService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = any;

function fakeClient(behaviour: 'ok' | Error & { code?: number; status?: number }) {
  const calls: Args[] = [];
  return {
    calls,
    client: {
      messages: {
        create: async (args: Args) => {
          calls.push(args);
          if (behaviour !== 'ok') throw behaviour;
          return { sid: 'SMtest', to: args.to, status: 'queued' };
        },
      },
    },
  };
}

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

async function expectError(fn: () => Promise<unknown>, code: unknown, msg: string): Promise<void> {
  try {
    await fn();
  } catch (err) {
    check(err instanceof SmsSendError && (err as SmsSendError).code === code, msg);
    return;
  }
  throw new Error(`FAIL: ${msg} (no error thrown)`);
}

async function main(): Promise<void> {
  Object.assign(config, {
    twilioAccountSid: 'ACtest',
    twilioAuthToken: 'test',
    twilioPhoneNumber: '+15550000000',
    twilioSmsFrom: 'CZEN',
    baseUrl: 'https://example.test',
  });

  const ok = fakeClient('ok');
  __setTwilioClientForTest(ok.client);
  const res = await sendSms('+84901234567', '[Czen] 15 phút nữa tôi đến đón');
  check(res.sid === 'SMtest' && res.status === 'queued', 'success returns Twilio sid and status');
  check(ok.calls[0].to === '+84901234567' && ok.calls[0].from === 'CZEN', 'sends to E.164 number from the SMS sender (TWILIO_SMS_FROM)');
  check(ok.calls[0].body === '[Czen] 15 phút nữa tôi đến đón', 'message body is passed unchanged');
  check(ok.calls[0].statusCallback === 'https://example.test/api/v1/sms/status', 'registers delivery-status callback when BASE_URL is https');

  Object.assign(config, { baseUrl: 'http://localhost:8000' });
  const local = fakeClient('ok');
  __setTwilioClientForTest(local.client);
  await sendSms('+84901234567', 'x');
  check(local.calls[0].statusCallback === undefined, 'no status callback when BASE_URL is not public https');

  await expectError(() => sendSms('0901234567', 'x'), 'INVALID_TO', 'rejects a non-E.164 number before calling Twilio');

  const geo = Object.assign(new Error('Permission to send an SMS has not been enabled for the region'), { code: 21408, status: 400 });
  __setTwilioClientForTest(fakeClient(geo).client);
  await expectError(() => sendSms('+84901234567', 'x'), 21408, 'surfaces Twilio error code (21408 geo permission)');

  Object.assign(config, { twilioAccountSid: '' });
  await expectError(() => sendSms('+84901234567', 'x'), 'CONFIG', 'reports missing Twilio configuration');

  __setTwilioClientForTest(null);
  process.stdout.write('SMS selfcheck passed\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
