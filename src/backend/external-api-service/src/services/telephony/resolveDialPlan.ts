import { config } from '../../config';
import { normalizePhone } from './normalize';
import { buildZaloPhoneDialUri, buildZaloUidDialUri } from './zaloUri';
import type { DialTargetInput, ResolvedDialPlan, TelephonyChannel } from './types';
import { TelephonyError } from './types';

function resolveTwilioTrialOverride(target: string): [string, string | null] {
  const verified = config.twilioVerifiedTo ? normalizePhone(config.twilioVerifiedTo) : '';
  if (config.callForceVerifiedTo && verified && target !== verified) {
    return [verified, `Đang gọi số Twilio đã xác minh ${verified} (trên đơn ghi ${target}).`];
  }
  return [target, null];
}

function defaultChannel(explicit?: TelephonyChannel): TelephonyChannel {
  if (explicit) return explicit;
  return config.telephonyDefaultChannel;
}

function trunkForChannel(channel: TelephonyChannel): string {
  if (channel === 'zalo') {
    if (!config.zaloSipTrunkId) {
      throw new TelephonyError('ZALO_SIP_TRUNK_ID required for zalo channel', 'CONFIG');
    }
    return config.zaloSipTrunkId;
  }
  if (!config.sipTrunkId) {
    throw new TelephonyError('SIP_TRUNK_ID required for phone channel', 'CONFIG');
  }
  return config.sipTrunkId;
}

/** Pick dial target + trunk for outbound LiveKit SIP. */
export function resolveDialPlan(input: DialTargetInput): ResolvedDialPlan {
  const channel = defaultChannel(input.channel);
  const normalized = normalizePhone(input.phone);

  if (channel === 'phone') {
    if (!normalized) throw new TelephonyError('phone is empty', 'INVALID_TARGET');
    const [dialTo, overrideNote] = resolveTwilioTrialOverride(normalized);
    return {
      channel,
      dialTo,
      sipTrunkId: trunkForChannel('phone'),
      identitySuffix: dialTo.replace(/\D/g, ''),
      overrideNote,
    };
  }

  if (!config.zaloAppId) {
    throw new TelephonyError('ZALO_APP_ID required for zalo channel', 'CONFIG');
  }

  const uid = input.zaloUid?.trim();
  if (uid) {
    const dialTo = buildZaloUidDialUri(uid, config.zaloAppId);
    return {
      channel,
      dialTo,
      sipTrunkId: trunkForChannel('zalo'),
      identitySuffix: uid.replace(/\D/g, ''),
      overrideNote: null,
    };
  }

  if (!normalized) throw new TelephonyError('phone or zaloUid required for zalo channel', 'INVALID_TARGET');

  const consentOk =
    input.zaloConsentGranted ||
    config.zaloSkipConsentCheck;
  if (!consentOk) {
    throw new TelephonyError(
      'Zalo outbound by phone requires call consent — request via POST /api/v1/calls/zalo/request-consent',
      'CONSENT_REQUIRED',
    );
  }

  const dialTo = buildZaloPhoneDialUri(normalized, config.zaloAppId);
  return {
    channel,
    dialTo,
    sipTrunkId: trunkForChannel('zalo'),
    identitySuffix: normalized.replace(/\D/g, ''),
    overrideNote: null,
  };
}
