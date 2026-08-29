/**
 * Canonical structured logger. Callers pass a message + facts.
 *
 *   bind({ room, conv })
 *   const log = getLogger('voice')
 *   log.info('agent dispatched')
 *
 * Line shape: `{ts} {LEVEL} {service} {fn} room=… conv=… — {msg} k=v`
 * Keep in sync with voice-agent `app/services/logger`.
 */
import { currentConv, currentRoom } from './context';
import { formatLine, type LogFields } from './format';

export { bind, currentConv, currentRoom, runWithLogContext } from './context';
export { attachLogContext } from './middleware';
export { formatLine, fmtValue } from './format';
export type { LogFields } from './format';

const SERVICE = process.env.SERVICE_NAME ?? 'trip-service';

function nowTs(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function getLogger(fn: string, service = SERVICE) {
  const emit = (level: 'debug' | 'info' | 'warning' | 'error', msg: string, fields?: LogFields) => {
    const line = formatLine({
      ts: nowTs(),
      level: level.toUpperCase(),
      service,
      fn,
      room: currentRoom(),
      conv: currentConv(),
      msg,
      fields,
    });
    if (level === 'error') {
      console.error(line);
      return;
    }
    if (level === 'warning') {
      console.warn(line);
      return;
    }
    console.log(line);
  };

  return {
    debug: (msg: string, fields?: LogFields) => emit('debug', msg, fields),
    info: (msg: string, fields?: LogFields) => emit('info', msg, fields),
    warning: (msg: string, fields?: LogFields) => emit('warning', msg, fields),
    error: (msg: string, fields?: LogFields) => emit('error', msg, fields),
  };
}
