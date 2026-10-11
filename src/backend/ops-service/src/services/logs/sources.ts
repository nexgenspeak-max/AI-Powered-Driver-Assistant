import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { config, LOG_SERVICE_IDS, type LogServiceId } from '../../config';

export interface LogDirs {
  /** `$LOG_DIR`: one `<service>.log` per Node service. */
  serviceDir: string;
  /** llm-orchestrator `logs/`: one `agent.<pid>.log` per worker process. */
  voiceDir: string;
}

/**
 * File base names per service. The first entry is the current SERVICE_NAME;
 * the rest are older names still set in some env files.
 */
const SERVICE_FILE_NAMES: Record<Exclude<LogServiceId, 'llm-orchestrator'>, string[]> = {
  'identity-service': ['identity-service', 'auth-service'],
  'external-api-service': ['external-api-service', 'trip-service'],
  'external-channel-service': ['external-channel-service', 'call-center'],
  'call-records-service': ['call-records-service', 'call-logger'],
  'ops-service': ['ops-service'],
};

/** Rotated backups (`agent.123.log.1`) are skipped: they only hold older lines. */
const VOICE_FILE = /^agent(\.\d+)?\.log$/;

/** Old worker files pile up; reading the newest few covers the live sessions. */
const MAX_VOICE_FILES = 8;

export function defaultLogDirs(): LogDirs {
  return { serviceDir: config.logDir, voiceDir: config.voiceAgentLogDir };
}

export function isLogServiceId(value: string): value is LogServiceId {
  return (LOG_SERVICE_IDS as readonly string[]).includes(value);
}

function mtimeOrZero(file: string): number {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

function voiceFiles(dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => VOICE_FILE.test(name))
    .map((name) => join(dir, name))
    .map((file) => ({ file, mtime: mtimeOrZero(file) }))
    .filter((entry) => entry.mtime > 0)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_VOICE_FILES)
    .map((entry) => entry.file);
}

function serviceFiles(id: Exclude<LogServiceId, 'llm-orchestrator'>, dir: string): string[] {
  return SERVICE_FILE_NAMES[id]
    .map((name) => join(dir, `${name}.log`))
    .filter((file) => mtimeOrZero(file) > 0);
}

/** Existing log files for one service, or for every service when `service` is omitted. */
export function resolveLogFiles(service?: LogServiceId, dirs: LogDirs = defaultLogDirs()): string[] {
  const ids = service ? [service] : [...LOG_SERVICE_IDS];
  return ids.flatMap((id) =>
    id === 'llm-orchestrator' ? voiceFiles(dirs.voiceDir) : serviceFiles(id, dirs.serviceDir),
  );
}
