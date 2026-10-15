import { basename, join } from 'path';
import { defaultLogDirs } from '../logs';

/** Same rule llm-orchestrator uses for trace file names; nothing else is ever opened. */
const ROOM = /^[A-Za-z0-9._-]+$/;
const MAX_ROOM_LENGTH = 200;
export const TRACE_EXT = '.jsonl';

/** `<LLM_ORCHESTRATOR_LOG_DIR>/traces`: one `<room>.jsonl` per voice session (local/dev only). */
export function defaultTracesDir(): string {
  return join(defaultLogDirs().voiceDir, 'traces');
}

export function isValidRoom(room: string): boolean {
  return room.length <= MAX_ROOM_LENGTH && ROOM.test(room) && !/^\.+$/.test(room);
}

export function traceFile(room: string, dir: string = defaultTracesDir()): string {
  if (!isValidRoom(room)) {
    throw new Error('invalid room');
  }
  return join(dir, `${room}${TRACE_EXT}`);
}

/** Room name of a trace file in the directory listing, or null for anything else. */
export function roomOfFile(name: string): string | null {
  if (!name.endsWith(TRACE_EXT)) {
    return null;
  }
  const room = basename(name, TRACE_EXT);
  return isValidRoom(room) ? room : null;
}
