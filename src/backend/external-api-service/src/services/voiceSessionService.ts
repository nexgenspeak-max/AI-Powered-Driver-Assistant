import { AgentDispatchClient, RoomServiceClient } from 'livekit-server-sdk';
import { ParticipantInfo_Kind } from '@livekit/protocol';
import { config } from '../config';
import { bind, getLogger } from './logger';

export type RoomAgentState = 'missing' | 'no_agent' | 'has_agent';

const log = getLogger('voice');

/**
 * Whether a LiveKit room still exists and already has an agent participant.
 * Used by POST /token so a reused driver session does not skip dispatch after
 * the local worker was killed (session key lives in cache for 3h).
 */
export async function getRoomAgentState(roomName: string): Promise<RoomAgentState> {
  if (!config.livekitApiKey || !config.livekitApiSecret) {
    return 'missing';
  }

  const rooms = new RoomServiceClient(
    config.livekitUrl,
    config.livekitApiKey,
    config.livekitApiSecret,
  );
  try {
    const participants = await rooms.listParticipants(roomName);
    const hasAgent = participants.some(
      (p) =>
        p.kind === ParticipantInfo_Kind.AGENT ||
        (typeof p.identity === 'string' && p.identity.startsWith('agent-')),
    );
    return hasAgent ? 'has_agent' : 'no_agent';
  } catch {
    return 'missing';
  }
}

export async function dispatchAgent(roomName: string, agentName: string): Promise<void> {
  try {
    const client = new AgentDispatchClient(
      config.livekitUrl,
      config.livekitApiKey,
      config.livekitApiSecret,
    );
    await client.createDispatch(roomName, agentName);
    bind({ room: roomName });
    log.info('agent dispatched', { agent: agentName });
  } catch (err) {
    log.warning('agent dispatch failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
