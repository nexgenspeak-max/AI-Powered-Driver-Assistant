// LiveKit dial for a trip this service already owns.
// Twilio SMS and PSTN live in external-channel-service.
// This file does not own accounts or call transcripts.
import {
  RoomServiceClient,
  AgentDispatchClient,
} from 'livekit-server-sdk';
import { config } from '../config';
import { cacheGet, cacheSet, driverLastCallKey } from '../cache/redis';
import { bind, getLogger } from './logger';
import {
  dialSipParticipant,
  normalizePhone,
  resolveDialPlan,
  TelephonyError,
  type TelephonyChannel,
} from './telephony';
import { hasCallConsent } from './zalo';

const log = getLogger('calls');

// How long "tóm tắt cuộc gọi" stays answerable from cache after a call ends.
// Was 1 hour — too short for a driver to still ask about a call from earlier
// in a long/overnight shift. DynamoDB (call-logger) has no working fallback
// lookup by driver phone right now (records are indexed by customer phone,
// not driver phone), so this cache is the only path back to a call's summary
// once the in-session context is gone — 24h comfortably covers a full shift.
const DRIVER_LAST_CALL_TTL_SECONDS = 24 * 60 * 60;

async function resolveCustomerDialPlan(opts: {
  customerPhone: string;
  channel?: TelephonyChannel;
  zaloUid?: string;
}) {
  const consentGranted = await hasCallConsent(opts.customerPhone);
  return resolveDialPlan({
    channel: opts.channel,
    phone: opts.customerPhone,
    zaloUid: opts.zaloUid,
    zaloConsentGranted: consentGranted,
  });
}

async function createBackgroundCallRoom(meta: Record<string, string>): Promise<string> {
  if (!config.livekitApiKey) {
    throw new Error('LIVEKIT_API_KEY must be set');
  }

  const tripPrefix = (meta.trip_id || 'trip').replace(/-/g, '').slice(0, 8);
  const roomName = `custcall-${tripPrefix}-${Math.floor(Date.now() / 1000)}`;

  const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
  await roomService.createRoom({ name: roomName, metadata: JSON.stringify(meta) });
  bind({ room: roomName });
  log.info('background room created');

  return roomName;
}

async function dispatchBackgroundAgent(roomName: string): Promise<void> {
  try {
    const agentDispatch = new AgentDispatchClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
    await agentDispatch.createDispatch(roomName, config.livekitAgentName);
    bind({ room: roomName });
    log.info('background agent dispatched');
  } catch (err) {
    log.warning('background agent dispatch failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function updateBackgroundRoomMeta(roomName: string, meta: Record<string, string>): Promise<void> {
  const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
  await roomService.updateRoomMetadata(roomName, JSON.stringify(meta));
}

export interface CallRecord {
  call_id: string;
  trip_id?: string;
  mode: string;
  status: 'in_progress' | 'completed';
  summary?: string;
  dialed_number?: string;
  livekit_room?: string;
  sip_identity?: string;
  channel?: TelephonyChannel;
}

export async function completeCustomerCall(
  driverPhone: string,
  callId: string,
  _summary: string,
): Promise<void> {
  // Cache is just a pointer (call_id) to the driver's most recent call, not
  // a copy of its content — the actual transcript+summary already lives in
  // call-logger's DynamoDB table (saved by voice-agent when the call ends),
  // looked up by this exact call_id (GET /calls/:callId/summary below).
  // `_summary` is accepted (and ignored) only because callers already pass
  // it — call-logger is the single source of truth, so nothing here needs
  // to duplicate it into Redis.
  //
  // Guard against a late completion: if the driver already placed a second
  // call in the ~1-2 minutes since this one started (each call's own start
  // overwrites this same key with its own call_id), this call's completion
  // can arrive AFTER that second call_id is already the cached "latest" —
  // blindly overwriting here would revert the pointer back to this older,
  // no-longer-relevant call. Only write if we're still the one being
  // pointed at (or nothing is cached at all).
  const current = await cacheGet<{ call_id?: string }>(driverLastCallKey(driverPhone));
  if (current?.call_id && current.call_id !== callId) {
    return;
  }

  await cacheSet(
    driverLastCallKey(driverPhone),
    { call_id: callId, status: 'completed' },
    DRIVER_LAST_CALL_TTL_SECONDS,
  );
}

/** In-room calls (agent + bridge) dial customer into the driver's LiveKit room. */
export async function startCustomerCall(opts: {
  driverPhone: string;
  customerPhone: string;
  tripId: string;
  mode: string;
  roomName?: string;
  lang?: string;
  customerName?: string;
  pickupAddress?: string;
  customMessage?: string;
  channel?: TelephonyChannel;
  zaloUid?: string;
}) {
  let dialPlan;
  try {
    dialPlan = await resolveCustomerDialPlan({
      customerPhone: opts.customerPhone,
      channel: opts.channel,
      zaloUid: opts.zaloUid,
    });
  } catch (err) {
    if (err instanceof TelephonyError) throw err;
    throw err;
  }

  if (opts.mode === 'background') {
    const baseMeta: Record<string, string> = {
      trip_id: opts.tripId,
      // Must stay byte-identical to opts.driverPhone (not normalizePhone'd) —
      // it round-trips back from the voice-agent job to complete the call via
      // driverLastCallKey(), which is keyed by the same raw, unnormalized
      // string the driver's own session uses everywhere else. Normalizing
      // here silently splits the record onto a different Redis key, so the
      // driver's "gọi xong chưa" query never sees status flip to completed.
      driver_phone: opts.driverPhone,
      customer_name: opts.customerName ?? '',
      customer_phone: normalizePhone(opts.customerPhone),
      pickup_address: opts.pickupAddress ?? '',
      // Read by session.py's custcall branch and forwarded into
      // CustomerCallAgent — empty string preserves the agent's existing
      // fixed background-call opening (no behavior change for callers that
      // don't set this).
      custom_message: opts.customMessage ?? '',
      lang: opts.lang ?? 'vn',
      mode: 'background',
      // The driver's OWN room (not dialed into — background calls always get
      // their own separate room) — the voice-agent job for this background
      // room reads this back to push a summary notification into the
      // driver's room once the call ends, so the driver's own agent can
      // announce it proactively instead of only on request.
      driver_room_name: opts.roomName ?? '',
      telephony_channel: dialPlan.channel,
    };

    const bgRoom = await createBackgroundCallRoom(baseMeta);
    const lk = await dialSipParticipant(bgRoom, dialPlan);

    const fullMeta = {
      ...baseMeta,
      call_id: lk.callId,
      sip_identity: lk.sipIdentity,
    };
    await updateBackgroundRoomMeta(bgRoom, fullMeta);
    await dispatchBackgroundAgent(bgRoom);
    const record: CallRecord = {
      call_id: lk.callId,
      trip_id: opts.tripId,
      mode: 'background',
      status: 'in_progress',
      dialed_number: dialPlan.dialTo,
      livekit_room: bgRoom,
      sip_identity: lk.sipIdentity,
      channel: dialPlan.channel,
    };

    // Cache only the pointer (call_id/status) — see completeCustomerCall's
    // comment above for why the content itself doesn't belong here.
    await cacheSet(
      driverLastCallKey(opts.driverPhone),
      { call_id: record.call_id, status: record.status },
      DRIVER_LAST_CALL_TTL_SECONDS,
    );

    return {
      ...record,
      override_note: dialPlan.overrideNote,
      customer_phone: normalizePhone(opts.customerPhone),
      driver_phone: opts.driverPhone,
    };
  }

  if (!opts.roomName?.trim()) {
    throw new Error('roomName is required for in-room customer calls (agent and bridge modes)');
  }

  if (opts.mode !== 'agent' && opts.mode !== 'bridge') {
    throw new Error(`Unsupported call mode: ${opts.mode}`);
  }

  const lk = await dialSipParticipant(opts.roomName.trim(), dialPlan);
  const callId = lk.callId;

  const record: CallRecord = {
    call_id: callId,
    trip_id: opts.tripId,
    mode: opts.mode,
    status: 'in_progress',
    dialed_number: dialPlan.dialTo,
    livekit_room: opts.roomName.trim(),
    sip_identity: lk.sipIdentity,
    channel: dialPlan.channel,
  };

  // Cache only the pointer (call_id/status) — see completeCustomerCall's
  // comment above for why the content itself doesn't belong here.
  await cacheSet(
    driverLastCallKey(opts.driverPhone),
    { call_id: record.call_id, status: record.status },
    DRIVER_LAST_CALL_TTL_SECONDS,
  );

  return {
    call_id: callId,
    status: 'initiated',
    mode: opts.mode,
    dialed_number: dialPlan.dialTo,
    channel: dialPlan.channel,
    customer_phone: normalizePhone(opts.customerPhone),
    override_note: dialPlan.overrideNote,
    trip_id: opts.tripId,
    driver_phone: opts.driverPhone,
    livekit_room: opts.roomName.trim(),
    sip_identity: lk.sipIdentity,
  };
}

/** Customer-initiated call: dial the driver's phone into the customer's LiveKit room. */
export async function startDriverCall(opts: {
  driverPhone: string;
  customerPhone: string;
  tripId: string;
  roomName: string;
  channel?: TelephonyChannel;
}) {
  if (!opts.roomName?.trim()) {
    throw new Error('roomName is required to call the driver');
  }
  const dialPlan = resolveDialPlan({
    channel: opts.channel ?? 'phone',
    phone: opts.driverPhone,
  });
  const lk = await dialSipParticipant(opts.roomName.trim(), dialPlan, 'driver');

  return {
    call_id: lk.callId,
    status: 'initiated',
    mode: 'bridge',
    dialed_number: dialPlan.dialTo,
    channel: dialPlan.channel,
    driver_phone: normalizePhone(opts.driverPhone),
    override_note: dialPlan.overrideNote,
    trip_id: opts.tripId,
    customer_phone: normalizePhone(opts.customerPhone),
    livekit_room: opts.roomName.trim(),
    sip_identity: lk.sipIdentity,
  };
}

export { TelephonyError };
