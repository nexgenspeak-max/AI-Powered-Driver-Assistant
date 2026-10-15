import { parseLines, readRange, sizeOf, splitAtLastNewline, type TraceEvent } from './events';
import { defaultTracesDir, traceFile } from './paths';

const TAIL_POLL_MS = 1000;

export interface TailOptions {
  /** Byte offset to start from (`readSession().offset`); default: current end of file. */
  fromOffset?: number;
  /** Events with `seq` up to this were already delivered and are skipped. */
  afterSeq?: number;
  pollMs?: number;
  dir?: string;
}

/**
 * Calls `onEvent` for each complete line appended to `<room>.jsonl`, in order.
 * A line split across writes is held until its newline arrives; a truncated
 * file is read again from the top.
 */
export function tailSession(
  room: string,
  onEvent: (event: TraceEvent) => void,
  options: TailOptions = {},
): { stop: () => void } {
  const file = traceFile(room, options.dir ?? defaultTracesDir());
  let offset = options.fromOffset ?? Math.max(0, sizeOf(file));
  let partial: Buffer = Buffer.alloc(0);
  let lastSeq = options.afterSeq ?? -Infinity;

  const tick = () => {
    const size = sizeOf(file);
    if (size < 0) {
      return;
    }
    if (size < offset) {
      offset = 0;
      partial = Buffer.alloc(0);
      lastSeq = -Infinity;
    }
    if (size === offset) {
      return;
    }
    let data: Buffer;
    try {
      data = Buffer.concat([partial, readRange(file, offset, size)]);
    } catch {
      return;
    }
    offset = size;
    const split = splitAtLastNewline(data);
    partial = split.partial;
    for (const event of parseLines(split.complete)) {
      if (event.seq > lastSeq) {
        lastSeq = event.seq;
        onEvent(event);
      }
    }
  };

  const timer = setInterval(tick, options.pollMs ?? TAIL_POLL_MS);
  return { stop: () => clearInterval(timer) };
}
