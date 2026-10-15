/**
 * SMS path contract for external-api-service, with fetch stubbed (no real SMS).
 * Run: npm run verify:sms
 */
import { config } from '../../config';
import { sendSms, withSenderLabel } from '../smsService';
import { buildTripConfirmationSms } from './messages';
import { resolveSmsTarget, SmsTargetError } from './resolveSmsTarget';

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);  // CLI output; raw console is banned in src (verify:logger)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Body = any;
let lastBody: Body = null;
function stubFetch(status: number, json: Body): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = async (_url: string, init: { body: string }) => {
    lastBody = JSON.parse(init.body);
    return { ok: status < 400, status, json: async () => json };
  };
}

async function main(): Promise<void> {
  Object.assign(config, { twilioVerifiedTo: '', callForceVerifiedTo: false, smsSenderLabel: '[Czen]', callCenterUrl: 'http://channel.test' });

  check(resolveSmsTarget('0901234567').to === '+84901234567', 'local number 09… becomes +84…');
  check(resolveSmsTarget('+84 90-123 4567').to === '+84901234567', 'spaces and dashes are removed');
  check(resolveSmsTarget('84901234567').to === '+84901234567', 'country code without + is accepted');
  let threw = false;
  try { resolveSmsTarget('abc'); } catch (e) { threw = e instanceof SmsTargetError; }
  check(threw, 'unusable number is rejected before calling Twilio');

  Object.assign(config, { twilioVerifiedTo: '0909999999', callForceVerifiedTo: true });
  const trial = resolveSmsTarget('0901234567');
  check(trial.to === '+84909999999' && !!trial.overrideNote && !/\d{6}/.test(trial.overrideNote), 'trial mode redirects to verified number; note has no phone number');
  Object.assign(config, { twilioVerifiedTo: '', callForceVerifiedTo: false });

  check(withSenderLabel('15 phút nữa tôi đến đón') === '[Czen] 15 phút nữa tôi đến đón', 'sender label is prefixed');
  check(withSenderLabel('[Czen] đã có') === '[Czen] đã có', 'label is not doubled');

  const sms = buildTripConfirmationSms({ pickup_address: '12 Lê Lợi, Quận 1', pickup_time: '2026-10-12T02:30:00Z' });
  check(sms.includes('12 Lê Lợi, Quận 1') && sms.includes('09:30'), 'confirmation SMS carries pickup address and Vietnam time');

  stubFetch(200, { sid: 'SMtest', to: '+84901234567', status: 'queued' });
  const res = await sendSms('0901234567', '15 phút nữa tôi đến đón');
  check(lastBody.phoneNumber === '+84901234567', 'channel service receives the E.164 number');
  check(lastBody.message === '[Czen] 15 phút nữa tôi đến đón', 'channel service receives the labelled message');
  check(res.status === 'queued' && res.sid === 'SMtest', 'result carries Twilio status');

  stubFetch(400, { error: 'Permission to send an SMS has not been enabled', code: 21408 });
  let msg = '';
  try { await sendSms('0901234567', 'x'); } catch (e) { msg = String(e); }
  check(msg.includes('Twilio 21408'), 'Twilio error code is propagated to the caller');

  process.stdout.write('SMS selfcheck passed\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
