import { config } from '../../config';
import { normalizePhone } from '../telephony/normalize';

export class SmsTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmsTargetError';
  }
}

export interface SmsTarget {
  /** E.164 number Twilio will send to. */
  to: string;
  /** Number on the trip / request, after normalization. */
  requested: string;
  /** Set when a Twilio-trial redirect replaced the real number. */
  overrideNote: string | null;
}

/** E.164: "+" then 8–15 digits. */
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Twilio only accepts E.164 numbers, but trips store the phone as typed by the
 * dispatcher (e.g. "0901234567"). Same normalization as outbound calls, plus the
 * same opt-in Twilio-trial redirect (CALL_FORCE_VERIFIED_TO + TWILIO_VERIFIED_TO).
 */
export function resolveSmsTarget(phone: string): SmsTarget {
  const requested = normalizePhone(phone || '');
  if (!requested || !E164.test(requested)) {
    throw new SmsTargetError(`invalid phone number for SMS: "${phone}"`);
  }
  const verified = config.twilioVerifiedTo ? normalizePhone(config.twilioVerifiedTo) : '';
  if (config.callForceVerifiedTo && verified && verified !== requested) {
    // Note carries no phone number: logs must not contain full phone numbers (NFR-05).
    return { to: verified, requested, overrideNote: 'SMS redirected to TWILIO_VERIFIED_TO (Twilio trial mode)' };
  }
  return { to: requested, requested, overrideNote: null };
}
