import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const env = process.env.ENV || 'local';
const envPath = `envs/.env.${env}`;
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const repoLogs = resolve(__dirname, '../../../../logs');
const voiceLogs = resolve(__dirname, '../../llm-orchestrator/logs');

const voiceAgentRoot = resolve(__dirname, '../../llm-orchestrator');

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
  port: Number(process.env.PORT || 8004),
  jwtSecret: resolveJwtSecret(),
  logDir: process.env.LOG_DIR || repoLogs,
  voiceAgentLogDir: process.env.VOICE_AGENT_LOG_DIR || voiceLogs,
  voiceAgentRoot: process.env.VOICE_AGENT_ROOT || voiceAgentRoot,
  logFreshnessMs: Number(process.env.LOG_FRESHNESS_MS || 30_000),
  callLoggerUrl:
    process.env.CALL_RECORDS_SERVICE_URL ||
    process.env.CALL_LOGGER_URL ||
    'http://localhost:8001',
  healthUrls: {
    'identity-service':
      process.env.IDENTITY_HEALTH_URL ||
      process.env.AUTH_HEALTH_URL ||
      'http://localhost:8003/health',
    'external-api-service':
      process.env.EXTERNAL_API_HEALTH_URL ||
      process.env.TRIP_HEALTH_URL ||
      'http://localhost:8002/health',
    'external-channel-service':
      process.env.EXTERNAL_CHANNEL_HEALTH_URL ||
      process.env.CALL_CENTER_HEALTH_URL ||
      'http://localhost:8000/health',
    'call-records-service':
      process.env.CALL_RECORDS_HEALTH_URL ||
      process.env.CALL_LOGGER_HEALTH_URL ||
      'http://localhost:8001/health',
    'ops-service': process.env.OPS_HEALTH_URL || 'http://localhost:8004/health',
  } as const,
};

export type HttpServiceId = keyof typeof config.healthUrls;
export const LOG_SERVICE_IDS = [
  'identity-service',
  'external-api-service',
  'external-channel-service',
  'call-records-service',
  'ops-service',
  'llm-orchestrator',
] as const;
export type LogServiceId = (typeof LOG_SERVICE_IDS)[number];
