/**
 * Golden contract for ZCC dial URI + resolveDialPlan.
 * Run: npm run verify:telephony
 */
import { buildZaloPhoneDialUri, buildZaloUidDialUri, resolveDialPlan, TelephonyError } from './index';

const TEST_APP_ID = '9876543210';

const GOLDEN = {
  zaloPhoneUri: '+84901234567@9876543210.zcc.openapi.zaloapp.com',
  zaloUidUri: '999888777@9876543210.zcc.openapi.zaloapp.com',
  phoneDialTo: '+84987654321',
} as const;

function mockConfig(overrides: Record<string, string | boolean> = {}): void {
  const base = {
    telephonyDefaultChannel: 'phone',
    sipTrunkId: 'ST_twilio_test',
    zaloSipTrunkId: 'ST_zalo_test',
    zaloAppId: TEST_APP_ID,
    twilioVerifiedTo: '',
    callForceVerifiedTo: false,
    zaloSkipConsentCheck: false,
    ...overrides,
  };
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('../../config') as { config: Record<string, unknown> };
  Object.assign(config, base);
}

export function assertTelephonyGoldenContract(): void {
  mockConfig();

  const phoneUri = buildZaloPhoneDialUri('0901234567', TEST_APP_ID);
  if (phoneUri !== GOLDEN.zaloPhoneUri) {
    throw new Error(`zalo phone URI drift:\n got: ${phoneUri}\nwant: ${GOLDEN.zaloPhoneUri}`);
  }

  const uidUri = buildZaloUidDialUri('999888777', TEST_APP_ID);
  if (uidUri !== GOLDEN.zaloUidUri) {
    throw new Error(`zalo UID URI drift:\n got: ${uidUri}\nwant: ${GOLDEN.zaloUidUri}`);
  }

  const phonePlan = resolveDialPlan({ phone: '0987654321' });
  if (phonePlan.channel !== 'phone' || phonePlan.dialTo !== GOLDEN.phoneDialTo) {
    throw new Error(`phone plan drift: ${JSON.stringify(phonePlan)}`);
  }
  if (phonePlan.sipTrunkId !== 'ST_twilio_test') {
    throw new Error(`phone trunk drift: ${phonePlan.sipTrunkId}`);
  }

  const zaloUidPlan = resolveDialPlan({ channel: 'zalo', phone: '0901234567', zaloUid: '999888777' });
  if (zaloUidPlan.dialTo !== GOLDEN.zaloUidUri || zaloUidPlan.channel !== 'zalo') {
    throw new Error(`zalo uid plan drift: ${JSON.stringify(zaloUidPlan)}`);
  }

  let consentBlocked = false;
  try {
    resolveDialPlan({ channel: 'zalo', phone: '0901234567' });
  } catch (err) {
    consentBlocked =
      err instanceof TelephonyError && err.code === 'CONSENT_REQUIRED';
  }
  if (!consentBlocked) {
    throw new Error('expected CONSENT_REQUIRED for zalo+phone without consent');
  }

  const zaloPhonePlan = resolveDialPlan({
    channel: 'zalo',
    phone: '0901234567',
    zaloConsentGranted: true,
  });
  if (zaloPhonePlan.dialTo !== GOLDEN.zaloPhoneUri) {
    throw new Error(`zalo phone plan drift: ${JSON.stringify(zaloPhonePlan)}`);
  }
}

if (require.main === module) {
  try {
    assertTelephonyGoldenContract();
    process.stdout.write('telephony golden contract ok\n');
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  }
}
