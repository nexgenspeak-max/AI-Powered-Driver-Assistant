import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { AccessToken, VideoGrant, AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config';
import { cacheGet, cacheDel, driverPendingNudgeKey, driverSessionKey } from '../cache/redis';
import { invalidateDriverContext } from '../services/driverContextService';

const router = Router();

interface PendingNudge {
  kind: string;
  payload: Record<string, unknown>;
}
async function dispatchAgent(roomName: string, agentName: string): Promise<void> {
  try {
    const client = new AgentDispatchClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
    await client.createDispatch(roomName, agentName);
    console.log(`[voice] agent '${agentName}' dispatched | room=${roomName}`);
  } catch (err) {
    console.warn(`[voice] agent dispatch failed (non-fatal): ${err}`);
  }
}

function makeToken(identity: string, name: string, roomName: string): Promise<string> {
  const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity,
    name,
    ttl: 3600,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  } as VideoGrant);
  return at.toJwt();
}

router.post('/token', async (req: Request, res: Response) => {
  try {
    const { driver_phone } = req.query;
    if (!config.livekitApiKey || !config.livekitApiSecret) {
      return res.status(503).json({ detail: 'LiveKit not configured' });
    }

    const phone = String(driver_phone);

    // If this driver already has a live session — driverSessionKey is set by
    // PUT /me/session once a client actually joins a room, and cleared on
    // normal disconnect (see that route's own comment) — reuse that SAME
    // room instead of minting a second one. This endpoint used to always
    // create a fresh room + dispatch a fresh agent job no matter what:
    // driver-app's voiceSessionStore.ts has its own in-memory re-entrancy
    // lock that closes the wake-word-vs-manual-tap race WITHIN one running
    // app instance, but that lock can't protect against anything that
    // produces a second independent request for the same driver — an app
    // crash/relaunch mid-connect (which resets that lock), Fast Refresh
    // during dev, or the same account open on two devices. Any of those hit
    // this route twice and, with no server-side check, ended up with two
    // separate LiveKit rooms and two separately-dispatched agent jobs for
    // one driver, with nothing ever reconciling them. Also switched the room
    // name to a UUID suffix instead of Date.now()/1000 (second-granularity —
    // two genuinely-new-session requests landing in the same second used to
    // collide onto the identical room name and double-dispatch onto it).
    const existingSession = await cacheGet<{ room_name: string }>(driverSessionKey(phone));
    const roomName = existingSession?.room_name || `driver-${phone.replace('+', '')}-${randomUUID()}`;

    // Deliver anything reachDriver() couldn't push live (driver had no
    // session open at the time — see driverReachService.ts) as soon as they
    // open the app on their own. Room metadata uses `nudge_kind`, never
    // `trip_id` — see driverReachService.ts's header comment for why that
    // distinction matters (keeps this session in full inbound-tool mode).
    // Only applies to the fresh-room path: reachDriver() only ever saves a
    // pending nudge when it found NO open session, so if we just found one
    // above, this should already be empty in the normal case.
    if (!existingSession) {
      const pending = await cacheGet<PendingNudge>(driverPendingNudgeKey(phone));
      if (pending) {
        await cacheDel(driverPendingNudgeKey(phone));
        // Flip has_pending_nudge back to false for the app's next context poll
        // — without this, driver-app's auto-connect effect could see a stale
        // cached `true` (up to config.cacheTtlSeconds) and try to reconnect
        // again right after this session already delivered the nudge.
        await invalidateDriverContext(phone);
        const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
        const metadata = JSON.stringify({ nudge_kind: pending.kind, ...pending.payload });
        await roomService.createRoom({ name: roomName, metadata });
        console.log(`[voice] delivering pending nudge | driver=${phone} kind=${pending.kind} room=${roomName}`);
      }
    }

    const token = await makeToken(`driver-${phone}`, phone, roomName);

    if (existingSession) {
      console.log(`[voice] reusing existing session instead of creating a new room | driver=${phone} room=${roomName}`);
    } else {
      await dispatchAgent(roomName, config.livekitAgentName);
    }

    return res.json({ token, room_name: roomName, livekit_url: config.livekitUrl });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Called by voice-agent (session_control.py's end_room_session) instead of
// voice-agent holding its own LiveKit admin credentials/client to remove
// participants directly — centralizes room-administration in trip-service,
// which already has a RoomServiceClient set up for token issuance above.
// Per-identity, not a blanket deleteRoom(): only removes the specific
// participant(s) the caller identified (typically just the driver/customer,
// not the agent's own participant), matching the previous direct-LiveKit-API
// behavior exactly. Errors are logged and skipped per-identity rather than
// failing the whole request — a participant that already left is not this
// caller's problem to retry.
router.post('/end-session', async (req: Request, res: Response) => {
  try {
    const { room_name, participant_identities } = req.body as {
      room_name?: string;
      participant_identities?: string[];
    };
    if (!room_name || !Array.isArray(participant_identities)) {
      return res.status(400).json({ detail: 'room_name and participant_identities are required' });
    }
    if (!config.livekitApiKey || !config.livekitApiSecret) {
      return res.status(503).json({ detail: 'LiveKit not configured' });
    }

    const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
    for (const identity of participant_identities) {
      try {
        await roomService.removeParticipant(room_name, identity);
        console.log(`[voice] end-session removed participant | room=${room_name} identity=${identity}`);
      } catch (err) {
        console.warn(`[voice] end-session could not remove ${identity} from ${room_name}: ${err}`);
      }
    }

    return res.json({ status: 'ok' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/customer-token', async (req: Request, res: Response) => {
  try {
    const { customer_phone } = req.query;
    if (!config.livekitApiKey || !config.livekitApiSecret) {
      return res.status(503).json({ detail: 'LiveKit not configured' });
    }

    const phone = String(customer_phone);
    // UUID suffix, not Date.now()/1000 — see /token's own comment on why
    // second-granularity room names can collide. No session-reuse check
    // here (unlike /token): there's no customer-side equivalent of
    // driverSessionKey today, and customers don't have a wake-word/
    // manual-tap dual-trigger path to race in the first place — this is
    // just the same narrow room-naming fix, not a scope expansion into
    // customer session tracking.
    const roomName = `customer-${phone.replace('+', '')}-${randomUUID()}`;
    const token = await makeToken(`customer-${phone}`, phone, roomName);

    await dispatchAgent(roomName, config.livekitAgentName);

    return res.json({ token, room_name: roomName, livekit_url: config.livekitUrl });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
