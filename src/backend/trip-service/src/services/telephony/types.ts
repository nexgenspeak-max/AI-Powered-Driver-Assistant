/** Outbound dial channel — PSTN (Twilio/LiveKit trunk) or Zalo Cloud Connect (ZCC). */

export type TelephonyChannel = 'phone' | 'zalo';

export interface DialTargetInput {
  channel?: TelephonyChannel;
  phone: string;
  /** Zalo user id — skips phone consent when channel=zalo and set. */
  zaloUid?: string;
  /** When true, allow zalo+phone dial without prior consent (local dev only). */
  zaloConsentGranted?: boolean;
}

export interface ResolvedDialPlan {
  channel: TelephonyChannel;
  /** Value passed to LiveKit SipClient.createSipParticipant (E.164 or ZCC SIP URI). */
  dialTo: string;
  sipTrunkId: string;
  identitySuffix: string;
  overrideNote: string | null;
}

export interface SipDialResult {
  callId: string;
  sipIdentity: string;
}

export class TelephonyError extends Error {
  constructor(
    message: string,
    readonly code: 'CONSENT_REQUIRED' | 'CONFIG' | 'INVALID_TARGET',
  ) {
    super(message);
    this.name = 'TelephonyError';
  }
}
