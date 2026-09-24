import dotenv from 'dotenv';
import { existsSync } from 'fs';

const env = process.env.ENV || 'local';
const envPath = `envs/.env.${env}`;
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (env === 'local') {
    return 'dev-secret-change-me';
  }
  throw new Error('JWT_SECRET is required when ENV is not local');
}

export const config = {
  env,
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-trips',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',

  jwtSecret: resolveJwtSecret(),
  // dual-read: IDENTITY_SERVICE_URL preferred; AUTH_SERVICE_URL still accepted
  authServiceUrl:
    process.env.IDENTITY_SERVICE_URL ||
    process.env.AUTH_SERVICE_URL ||
    'http://localhost:8003',

  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',
  livekitAgentName: process.env.LIVEKIT_AGENT_NAME || 'driver-assistant',
  sipTrunkId: process.env.SIP_TRUNK_ID || '',
  /** Zalo Cloud Connect outbound trunk (LiveKit) — parallel to Twilio PSTN trunk. */
  zaloSipTrunkId: process.env.ZALO_SIP_TRUNK_ID || '',
  zaloAppId: process.env.ZALO_APP_ID || '',
  zaloAccessToken: process.env.ZALO_ACCESS_TOKEN || '',
  zaloConsentReasonCode: Number(process.env.ZALO_CONSENT_REASON_CODE || 103),
  /** Local dev only — skip Zalo phone consent gate. Never true in production. */
  zaloSkipConsentCheck: process.env.ZALO_SKIP_CONSENT_CHECK === 'true',
  telephonyDefaultChannel: (process.env.TELEPHONY_DEFAULT_CHANNEL === 'zalo' ? 'zalo' : 'phone') as 'phone' | 'zalo',

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

  // dual-read: EXTERNAL_CHANNEL_SERVICE_URL / CALL_RECORDS_SERVICE_URL preferred
  callCenterUrl:
    process.env.EXTERNAL_CHANNEL_SERVICE_URL ||
    process.env.CALL_CENTER_URL ||
    'http://localhost:8000',
  callLoggerUrl:
    process.env.CALL_RECORDS_SERVICE_URL ||
    process.env.CALL_LOGGER_URL ||
    'http://localhost:8001',
  twilioVerifiedTo: process.env.TWILIO_VERIFIED_TO || '',
  // Opt-IN, not opt-out. When true, EVERY outbound customer/driver call is
  // redirected to TWILIO_VERIFIED_TO regardless of the real trip phone — a
  // Twilio-trial workaround (trial accounts can only dial verified numbers).
  // It used to default on (`!== 'false'`), which silently routed real calls
  // to the one verified test number whenever TWILIO_VERIFIED_TO was set —
  // e.g. a trip booked with 0888887798 still rang 0382759152. Now it only
  // ever redirects when explicitly set: CALL_FORCE_VERIFIED_TO=true.
  callForceVerifiedTo: process.env.CALL_FORCE_VERIFIED_TO === 'true',

  redisUrl: process.env.REDIS_URL || '',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 120),
  // Fallback only when the booker omits driver_phone (voice booking).
  // Local may use DEFAULT_DRIVER_PHONE from env; never ship a baked-in
  // production number — empty means POST /trips must receive driver_phone.
  phoneDriver: process.env.DEFAULT_DRIVER_PHONE || '',
};
