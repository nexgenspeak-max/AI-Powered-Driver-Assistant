import dotenv from 'dotenv';

const env = process.env.ENV || 'local';
if (env === 'local') {
  dotenv.config({ path: `envs/.env.${env}` });
}

export const config = {
  env,
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  baseUrl: process.env.BASE_URL || 'http://localhost:8000',
};
