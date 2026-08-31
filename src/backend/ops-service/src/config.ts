import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const env = process.env.ENV || 'local';
const envPath = `envs/.env.${env}`;
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const repoLogs = resolve(__dirname, '../../../../logs');
const voiceLogs = resolve(__dirname, '../../voice-agent/logs');

const voiceAgentRoot = resolve(__dirname, '../../voice-agent');

export const config = {
  env,
  port: Number(process.env.PORT || 8004),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  logDir: process.env.LOG_DIR || repoLogs,
  voiceAgentLogDir: process.env.VOICE_AGENT_LOG_DIR || voiceLogs,
  voiceAgentRoot: process.env.VOICE_AGENT_ROOT || voiceAgentRoot,
  logFreshnessMs: Number(process.env.LOG_FRESHNESS_MS || 30_000),
  callLoggerUrl: process.env.CALL_LOGGER_URL || 'http://localhost:8001',
  healthUrls: {
    'auth-service': process.env.AUTH_HEALTH_URL || 'http://localhost:8003/health',
    'trip-service': process.env.TRIP_HEALTH_URL || 'http://localhost:8002/health',
    'call-center': process.env.CALL_CENTER_HEALTH_URL || 'http://localhost:8000/health',
    'call-logger': process.env.CALL_LOGGER_HEALTH_URL || 'http://localhost:8001/health',
    'ops-service': process.env.OPS_HEALTH_URL || 'http://localhost:8004/health',
  } as const,
};

export type HttpServiceId = keyof typeof config.healthUrls;
export const LOG_SERVICE_IDS = [
  'auth-service',
  'trip-service',
  'call-center',
  'call-logger',
  'ops-service',
  'voice-agent',
] as const;
export type LogServiceId = (typeof LOG_SERVICE_IDS)[number];
