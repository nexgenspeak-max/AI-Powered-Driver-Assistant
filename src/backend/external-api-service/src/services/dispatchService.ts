import {
  RoomServiceClient,
  AgentDispatchClient,
} from 'livekit-server-sdk';
import { config } from '../config';
import { bind, getLogger } from './logger';
import { dialSipParticipant, resolveDialPlan } from './telephony';

const log = getLogger('dispatch');

export interface TripData {
  trip_id: string;
  driver_phone: string;
  customer_name: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_time?: string;
  distance_km?: number;
  eta_minutes?: number;
  traffic_note?: string;
  route_summary?: string;
}

export async function dispatchCall(trip: TripData): Promise<string> {
  if (!config.livekitApiKey) {
    throw new Error('LIVEKIT_API_KEY must be set to dispatch calls');
  }

  const driverPhoneClean = trip.driver_phone.replace('+', '');
  const roomName = `driver-${driverPhoneClean}-${Math.floor(Date.now() / 1000)}`;
  const sipIdentity = `driver-${driverPhoneClean}`;

  const metadata = JSON.stringify({
    trip_id: trip.trip_id,
    driver_phone: trip.driver_phone,
    customer_name: trip.customer_name,
    pickup_address: trip.pickup_address,
    dropoff_address: trip.dropoff_address,
    pickup_time: trip.pickup_time ?? '',
    distance_km: String(trip.distance_km ?? ''),
    eta_minutes: String(trip.eta_minutes ?? ''),
    traffic_note: trip.traffic_note ?? '',
    route_summary: trip.route_summary ?? '',
    sip_identity: sipIdentity,
  });

  const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
  await roomService.createRoom({ name: roomName, metadata });
  bind({ room: roomName });
  log.info('room created');

  try {
    const agentDispatch = new AgentDispatchClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
    await agentDispatch.createDispatch(roomName, config.livekitAgentName);
    log.info('agent dispatched');
  } catch (err) {
    log.warning('agent dispatch failed (non-fatal)', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  if (config.sipTrunkId) {
    const plan = resolveDialPlan({ phone: trip.driver_phone, channel: 'phone' });
    const lk = await dialSipParticipant(roomName, plan, 'driver');
    if (lk.sipIdentity !== sipIdentity) {
      log.warning('SIP identity mismatch vs metadata', {
        expected: sipIdentity,
        actual: lk.sipIdentity,
      });
    }
    log.info('outbound SIP call initiated', { channel: plan.channel });
  } else {
    log.warning('SIP_TRUNK_ID not set — skipping SIP dial, agent-only room created');
  }

  return roomName;
}
