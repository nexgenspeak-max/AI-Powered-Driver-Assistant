import { SipClient } from 'livekit-server-sdk';
import { config } from '../../config';
import { bind, getLogger } from '../logger';
import type { ResolvedDialPlan, SipDialResult } from './types';

const log = getLogger('telephony');

export async function dialSipParticipant(
  roomName: string,
  plan: ResolvedDialPlan,
  identityPrefix: 'customer' | 'driver' = 'customer',
): Promise<SipDialResult> {
  if (!config.livekitApiKey || !config.livekitApiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET required for SIP dial');
  }

  const sipIdentity = `${identityPrefix}-${plan.identitySuffix}`;
  const sipClient = new SipClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
  await sipClient.createSipParticipant(plan.sipTrunkId, plan.dialTo, roomName, {
    participantIdentity: sipIdentity,
    participantName: identityPrefix === 'driver' ? 'driver' : 'customer',
    playRingtone: true,
  });

  bind({ room: roomName, conv: `${roomName}-${sipIdentity}` });
  log.info('SIP participant dialed', { channel: plan.channel, trunk: plan.sipTrunkId.slice(0, 8) });
  return { callId: `${roomName}-${sipIdentity}`, sipIdentity };
}
