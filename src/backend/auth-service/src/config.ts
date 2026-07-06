import dotenv from 'dotenv';
import { existsSync } from 'fs';

const env = process.env.ENV || 'local';
const envPath = `envs/.env.${env}`;
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const config = {
  env,
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-accounts',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
};
