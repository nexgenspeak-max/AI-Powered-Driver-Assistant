import dotenv from 'dotenv';

const env = process.env.ENV || 'local';
if (env === 'local') {
  dotenv.config({ path: `envs/.env.${env}` });
}

export const config = {
  env,
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-trips',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',

  livekitUrl: process.env.LIVEKIT_URL || '',
  livekitApiKey: process.env.LIVEKIT_API_KEY || '',
  livekitApiSecret: process.env.LIVEKIT_API_SECRET || '',
  livekitAgentName: process.env.LIVEKIT_AGENT_NAME || 'driver-assistant',
  sipTrunkId: process.env.SIP_TRUNK_ID || '',

  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',

  callCenterUrl: process.env.CALL_CENTER_URL || 'http://localhost:8000',
  twilioVerifiedTo: process.env.TWILIO_VERIFIED_TO || '',
  callForceVerifiedTo: process.env.CALL_FORCE_VERIFIED_TO !== 'false',
};
