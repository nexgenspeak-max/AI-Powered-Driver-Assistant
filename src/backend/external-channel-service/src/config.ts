import dotenv from 'dotenv';

const env = process.env.ENV || 'local';
if (env === 'local') {
  dotenv.config({ path: `envs/.env.${env}` });
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
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  // Local/dev default only — production must set BASE_URL explicitly.
  baseUrl: process.env.BASE_URL || (env === 'local' ? 'http://localhost:8000' : ''),
  jwtSecret: resolveJwtSecret(),
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
  // DynamoDB table for carrier events; empty = local JSONL file (dev only).
  eventsTable: process.env.EVENTS_TABLE || '',
};
