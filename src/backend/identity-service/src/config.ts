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
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-accounts',
  dynamodbSettingsTable: process.env.DYNAMODB_SETTINGS_TABLE || 'local-driver-assistant-driver-settings',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',

  jwtSecret: resolveJwtSecret(),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};
