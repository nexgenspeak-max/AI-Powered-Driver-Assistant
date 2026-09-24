import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

let ready = false;

/** Append a formatted line to `$LOG_DIR/<service>.log`. No-op if LOG_DIR is unset. */
export function writeLogLine(service: string, line: string): void {
  const dir = process.env.LOG_DIR;
  if (!dir) {
    return;
  }
  try {
    if (!ready) {
      mkdirSync(dir, { recursive: true });
      ready = true;
    }
    appendFileSync(join(dir, `${service}.log`), `${line}\n`, 'utf8');
  } catch {
    // Logger must never throw into the request path.
  }
}
