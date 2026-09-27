/**
 * Provider event store (port). Twilio webhooks, API dials and SMS sends are
 * this service's own data: it keeps them so /calls/events and
 * /calls/monitor/:callSid can show what the carrier reported.
 *
 * Adapters:
 *  - DynamoDB (EVENTS_TABLE set)  → deployed / shared environments
 *  - local JSONL file (unset)     → offline local dev only; Lambda has no durable disk
 */
export interface ProviderEvent {
  ts: string;                 // ISO time the event was received
  source: string;             // e.g. inbound_webhook, outbound_status, api_dial, sms_sent
  sid: string;                // CallSid | MessageSid | '-' — groups one call/message
  [field: string]: string;
}

export interface EventStore {
  put(event: ProviderEvent): Promise<void>;
  /** Most recent first; filtered to one CallSid/MessageSid when `sid` is given. */
  list(limit: number, sid?: string): Promise<ProviderEvent[]>;
}

export const VN_OFFSET_MS = 7 * 3600 * 1000;

/** Vietnam calendar day of an ISO timestamp (partition of the date index). */
export function eventDateOf(iso: string): string {
  return new Date(Date.parse(iso) + VN_OFFSET_MS).toISOString().slice(0, 10);
}

export function sidOf(payload: Record<string, string>): string {
  return payload.CallSid || payload.MessageSid || payload.SmsSid || payload.sid || '-';
}
