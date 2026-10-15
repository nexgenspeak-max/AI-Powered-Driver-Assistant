import { parseLine, parseLines, readRange, sizeOf, splitAtLastNewline, type TraceEvent } from './events';
import { defaultTracesDir, traceFile } from './paths';

export interface ReadOptions {
  /** Only events with `seq` greater than this (SSE Last-Event-ID resume). */
  afterSeq?: number;
  dir?: string;
}

export interface SessionSnapshot {
  events: TraceEvent[];
  /** Byte offset just past the last complete line; a tail continues from here. */
  offset: number;
}

/**
 * Every event of one session, or null when the trace file does not exist.
 * A last line without its newline is included only if it already parses; the
 * tail filters by seq, so it is not sent twice once the newline lands.
 */
export function readSession(room: string, options: ReadOptions = {}): SessionSnapshot | null {
  const file = traceFile(room, options.dir ?? defaultTracesDir());
  const size = sizeOf(file);
  if (size < 0) {
    return null;
  }
  const { complete, partial } = splitAtLastNewline(readRange(file, 0, size));
  const events = parseLines(complete);
  const last = parseLine(partial.toString('utf8'));
  if (last) {
    events.push(last);
  }
  const afterSeq = options.afterSeq;
  return {
    events: afterSeq === undefined ? events : events.filter((e) => e.seq > afterSeq),
    offset: size - partial.length,
  };
}
