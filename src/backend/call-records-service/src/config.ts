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
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-call-records',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
  // Shared with identity-service — verify only; never issue login tokens here.
  jwtSecret: resolveJwtSecret(),
};
