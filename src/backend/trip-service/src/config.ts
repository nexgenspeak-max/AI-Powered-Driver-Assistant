import dotenv from 'dotenv';
import { existsSync } from 'fs';

const env = process.env.ENV || 'local';
const envPath = `envs/.env.${env}`;
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const config = {
  env,
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-trips',
  dynamodbDeliveryOrdersTable: process.env.DYNAMODB_DELIVERY_ORDERS_TABLE || 'local-driver-assistant-delivery-orders',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:8003',
  // voice-agent's vision-api sidecar — reads delivery-order photos.
  voiceAgentUrl: process.env.VOICE_AGENT_URL || 'http://localhost:8080',

  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',
  livekitAgentName: process.env.LIVEKIT_AGENT_NAME || 'driver-assistant',
  sipTrunkId: process.env.SIP_TRUNK_ID || '',

  mapsProvider: process.env.MAPS_PROVIDER || 'google',
  mapsApiKey: process.env.MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
  proximityAlertMeters: Number(process.env.PROXIMITY_ALERT_METERS || 1000),
  // Closer, second checkpoint (~200m) — driver is now genuinely arriving at
  // A, so this is the right moment to compute and announce which pending
  // stop B to head to next (route-optimized, see next_stop.py), separate
  // from the 1km call-offer trigger above.
  nextStopAnnounceMeters: Number(process.env.NEXT_STOP_ANNOUNCE_METERS || 200),
  // How close (meters) the driver's reported GPS must be to the pickup/
  // dropoff point before arrived_pickup/picked_up/completed is accepted —
  // separate knob from proximityAlertMeters (the auto-call trigger) even
  // though they default to the same distance.
  arrivalRadiusMeters: Number(process.env.ARRIVAL_RADIUS_METERS || 1000),

  // Feature flags — default OFF so deploying this code never changes
  // production behavior on its own; flip on per-environment once verified.
  // ENABLE_PROXIMITY_ASK: when off, the 1km-away trigger keeps calling the
  // customer directly (today's behavior) instead of asking the driver first.
  enableProximityAsk: process.env.ENABLE_PROXIMITY_ASK === 'true',
  // ENABLE_NEXT_STOP_NUDGE: when off, finishing a pickup/dropoff never
  // proactively nudges the driver with a next-stop suggestion.
  enableNextStopNudge: process.env.ENABLE_NEXT_STOP_NUDGE === 'true',

  // Deployed (Lambda) WebSocket push — unused when env === 'local' (notify/
  // picks the `ws` implementation instead). Still used for trip_offer/
  // trip_confirmed/trip_rejected pushes on the driver_phone-based POST
  // /trips + PATCH /:tripId flow.
  connectionsTable: process.env.CONNECTIONS_TABLE || '',
  websocketApiEndpoint: process.env.WEBSOCKET_API_ENDPOINT || '',

  callCenterUrl: process.env.CALL_CENTER_URL || 'http://localhost:8000',
  callLoggerUrl: process.env.CALL_LOGGER_URL || 'http://localhost:8001',
  twilioVerifiedTo: process.env.TWILIO_VERIFIED_TO || '',
  callForceVerifiedTo: process.env.CALL_FORCE_VERIFIED_TO !== 'false',

  redisUrl: process.env.REDIS_URL || '',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 120),
  // TEMP fallback (hardcoded, not just env-configured) — used by POST /trips
  // when the caller doesn't pick a driver (currently just voice-agent's
  // phone-in booking, backend_api.py::create_trip — customer-app always
  // sends an explicit driver_phone via its DriverPicker). Remove once
  // voice-agent has its own driver selection.
  phoneDriver: process.env.DEFAULT_DRIVER_PHONE || '0382759152',
};
