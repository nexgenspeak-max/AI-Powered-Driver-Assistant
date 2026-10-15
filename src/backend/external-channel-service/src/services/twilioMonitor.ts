import * as path from 'path';
import { config } from '../config';
import { bind, getLogger } from './logger';
import { DynamoEventStore } from './events/dynamoStore';
import { FileEventStore } from './events/fileStore';
import { EventStore, ProviderEvent, sidOf } from './events/store';

const log = getLogger('twilio');

const store: EventStore = config.eventsTable
  ? new DynamoEventStore(config.eventsTable, config.awsRegion)
  : new FileEventStore(path.resolve(__dirname, '../../data'));

/**
 * Record one carrier event. Never throws: a storage failure must not fail the
 * Twilio webhook (Twilio would retry) or the SMS/dial that already happened.
 */
export async function logEvent(source: string, payload: Record<string, string>): Promise<void> {
  const event: ProviderEvent = { ...payload, ts: new Date().toISOString(), source, sid: sidOf(payload) };
  if (payload.CallSid) {
    bind({ conv: payload.CallSid });
  }
  // Status and error code only — never the phone number (NFR-05).
  log.info(source, {
    status: payload.CallStatus ?? payload.SmsStatus ?? payload.MessageStatus ?? payload.status ?? '-',
    ...(payload.ErrorCode ? { error_code: payload.ErrorCode } : {}),
  });
  try {
    await store.put(event);
  } catch (err) {
    log.error('event store write failed', { source, error: err instanceof Error ? err.message : String(err) });
  }
}

export function readEvents(limit = 200, sid?: string): Promise<ProviderEvent[]> {
  return store.list(limit, sid);
}
