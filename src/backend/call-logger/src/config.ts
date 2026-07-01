import dotenv from 'dotenv';

const env = process.env.ENV || 'local';
if (env === 'local') {
  dotenv.config({ path: `envs/.env.${env}` });
}

export const config = {
  env,
  dynamodbTable: process.env.DYNAMODB_TABLE || 'local-driver-assistant-call-records',
  awsRegion: process.env.AWS_REGION || 'ap-southeast-1',
};
