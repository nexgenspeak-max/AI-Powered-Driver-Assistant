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

  // Auto-match dispatch (POST /trips/auto-match) — separate from the
  // existing driver_phone-based POST /trips flow.
  dispatchRadiusMeters: Number(process.env.DISPATCH_RADIUS_METERS || 5000),
  dispatchOfferTimeoutSeconds: Number(process.env.DISPATCH_OFFER_TIMEOUT_SECONDS || 15),
  ridePoolBearingDegrees: Number(process.env.RIDE_POOL_BEARING_DEGREES || 40),

  // Deployed (Lambda) real-time/delay infra — unused when env === 'local'
  // (notify/dispatchTimer pick the `ws`/setTimeout implementation instead).
  connectionsTable: process.env.CONNECTIONS_TABLE || '',
  websocketApiEndpoint: process.env.WEBSOCKET_API_ENDPOINT || '',
  dispatchTimeoutQueueUrl: process.env.DISPATCH_TIMEOUT_QUEUE_URL || '',

  callCenterUrl: process.env.CALL_CENTER_URL || 'http://localhost:8000',
  callLoggerUrl: process.env.CALL_LOGGER_URL || 'http://localhost:8001',
  twilioVerifiedTo: process.env.TWILIO_VERIFIED_TO || '',
  callForceVerifiedTo: process.env.CALL_FORCE_VERIFIED_TO !== 'false',

  redisUrl: process.env.REDIS_URL || '',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS || 120),
  phoneDriver: process.env.DEFAULT_DRIVER_PHONE,
};
