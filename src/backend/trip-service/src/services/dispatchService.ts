import {
  RoomServiceClient,
  AgentDispatchClient,
  SipClient,
} from 'livekit-server-sdk';
import { config } from '../config';

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
  });

  const roomService = new RoomServiceClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
  await roomService.createRoom({ name: roomName, metadata });
  console.log(`[dispatch] room created: ${roomName}`);

  try {
    const agentDispatch = new AgentDispatchClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
    await agentDispatch.createDispatch(roomName, config.livekitAgentName);
    console.log(`[dispatch] agent dispatched | room=${roomName}`);
  } catch (err) {
    console.warn(`[dispatch] agent dispatch failed (non-fatal): ${err}`);
  }

  if (config.sipTrunkId) {
    const sipClient = new SipClient(config.livekitUrl, config.livekitApiKey, config.livekitApiSecret);
    await sipClient.createSipParticipant(config.sipTrunkId, trip.driver_phone, roomName, {
      participantName: 'driver',
      playRingtone: true,
    });
    console.log(`[dispatch] outbound SIP call initiated → ${trip.driver_phone}`);
  } else {
    console.warn('[dispatch] SIP_TRUNK_ID not set — skipping SIP dial, agent-only room created');
  }

  return roomName;
}
