import { Router, Request, Response } from 'express';
import { AccessToken, VideoGrant, AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config';
import { cacheGet, cacheDel, driverPendingNudgeKey } from '../cache/redis';
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
    const roomName = `driver-${phone.replace('+', '')}-${Math.floor(Date.now() / 1000)}`;

    // Deliver anything reachDriver() couldn't push live (driver had no
    // session open at the time — see driverReachService.ts) as soon as they
    // open the app on their own. Room metadata uses `nudge_kind`, never
    // `trip_id` — see driverReachService.ts's header comment for why that
    // distinction matters (keeps this session in full inbound-tool mode).
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

    const token = await makeToken(`driver-${phone}`, phone, roomName);

    await dispatchAgent(roomName, config.livekitAgentName);

    return res.json({ token, room_name: roomName, livekit_url: config.livekitUrl });
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
    const roomName = `customer-${phone.replace('+', '')}-${Math.floor(Date.now() / 1000)}`;
    const token = await makeToken(`customer-${phone}`, phone, roomName);

    await dispatchAgent(roomName, config.livekitAgentName);

    return res.json({ token, room_name: roomName, livekit_url: config.livekitUrl });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
