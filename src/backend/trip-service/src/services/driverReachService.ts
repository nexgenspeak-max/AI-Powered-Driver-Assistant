// Reaches a driver proactively — pushes into their currently open voice
// session if they have one, otherwise SAVES the nudge for delivery the next
// time the driver opens the app on their own (POST /voice/token picks it up
// — see voice.ts). Does NOT place a phone call: an earlier version dialed
// the driver via SIP as a fallback, but that's indistinguishable from a real
// incoming call (ringing the phone IS what SIP dialing does) — removed per
// explicit user request ("không muốn gọi điện cho tài xế nữa").
//
// IMPORTANT: metadata for a nudge session (whether pushed live or embedded
// in a driver-opened room) must NEVER include `trip_id`. voice-agent's
// DriverAgent switches into "new trip offer" mode (only confirm_trip/
// reject_trip, no call_customer/suggest_next_stop) the instant it sees that
// key in room metadata (app/voicebot/vn/agent.py's DriverAgent.__init__ —
// `if trip:` uses _DRIVER_OUTBOUND_TOOLS). A nudge uses `nudge_kind`/
// `related_trip_id` instead so it stays in full inbound-tool mode with a
// custom opening line (session.py's `proactive_nudge`).
import { DataPacket_Kind, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config';
import { cacheGet, cacheSet, driverSessionKey, driverPendingNudgeKey } from '../cache/redis';
import { invalidateDriverContext } from './driverContextService';

// Must match session.py's DRIVER_NUDGE_TOPIC exactly.
export const DRIVER_NUDGE_TOPIC = 'driver_proactive_nudge';

// How long a saved nudge waits for the driver to open the app on their own
// before it's just dropped — an hour-old "you're near pickup" would be
// actively misleading by the time they finally hear it.
const PENDING_NUDGE_TTL_SECONDS = 30 * 60;

export type NudgeKind =
  | 'debug_ping'
  | 'proximity_pickup'
  | 'proximity_dropoff'
  | 'suggest_next_stop';

interface DriverSession {
  room_name: string;
}

export async function reachDriver(
  driverPhone: string,
  kind: NudgeKind,
  payload: Record<string, unknown> = {},
): Promise<void> {
  if (!config.livekitApiKey) {
    console.warn('[driverReach] LIVEKIT_API_KEY not set — skipping nudge');
    return;
  }

  const session = await cacheGet<DriverSession>(driverSessionKey(driverPhone));
  if (session?.room_name) {
    try {
      const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
      await roomService.sendData(
        session.room_name,
        new TextEncoder().encode(JSON.stringify({ kind, ...payload })),
        DataPacket_Kind.RELIABLE,
        { topic: DRIVER_NUDGE_TOPIC },
      );
      console.log(`[driverReach] nudge pushed into open session | driver=${driverPhone} kind=${kind} room=${session.room_name}`);
      return;
    } catch (err) {
      // The cached room may already be closed (job crashed before clearing
      // the key) — fall through to saving it as pending instead of dropping
      // the nudge entirely.
      console.warn(`[driverReach] sendData failed, saving as pending instead | driver=${driverPhone}:`, err);
    }
  }

  await cacheSet(driverPendingNudgeKey(driverPhone), { kind, payload }, PENDING_NUDGE_TTL_SECONDS);
  // driver-app's context poll (has_pending_nudge) reads a SEPARATELY cached
  // snapshot (driverContextKey, up to config.cacheTtlSeconds stale) — without
  // this, the app could miss the pending nudge for up to that long even
  // though the key above is already set.
  await invalidateDriverContext(driverPhone);
  console.log(`[driverReach] no open session — saved as pending | driver=${driverPhone} kind=${kind}`);
}
