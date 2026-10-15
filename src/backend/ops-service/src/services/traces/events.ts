import { closeSync, openSync, readSync, statSync } from 'fs';

/**
 * One line of a trace file. Only the common fields are checked here; the
 * payload (`messages`, `tool_calls`, …) is passed through to the panel as-is.
 */
export interface TraceEvent {
  v: number;
  ts: number;
  room: string;
  seq: number;
  turn: number;
  kind: string;
  [key: string]: unknown;
}

const NEWLINE = 0x0a;

function isTraceEvent(value: unknown): value is TraceEvent {
  const e = value as Partial<TraceEvent> | null;
  return (
    !!e &&
    typeof e === 'object' &&
    typeof e.seq === 'number' &&
    typeof e.kind === 'string' &&
    typeof e.turn === 'number'
  );
}

/** Parsed event, or null for a blank, partial or foreign line. */
export function parseLine(line: string): TraceEvent | null {
  const text = line.trim();
  if (!text) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(text);
    return isTraceEvent(value) ? value : null;
  } catch {
    return null;
  }
}

export function parseLines(text: string): TraceEvent[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((e): e is TraceEvent => e !== null);
}

export function sizeOf(file: string): number {
  try {
    return statSync(file).size;
  } catch {
    return -1;
  }
}

export function readRange(file: string, start: number, end: number): Buffer {
  const length = Math.max(0, end - start);
  const buffer = Buffer.alloc(length);
  if (length === 0) {
    return buffer;
  }
  const fd = openSync(file, 'r');
  try {
    const read = readSync(fd, buffer, 0, length, start);
    return buffer.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

const SCAN_CHUNK_BYTES = 1024 * 1024;

/**
 * Calls `onEvent` for every complete line in `[0, end)` without holding the
 * whole file in memory (trace files carry a ~20KB prompt per LLM call).
 */
export function forEachEvent(file: string, end: number, onEvent: (event: TraceEvent) => void): void {
  const fd = openSync(file, 'r');
  try {
    let carry: Buffer = Buffer.alloc(0);
    for (let pos = 0; pos < end; pos += SCAN_CHUNK_BYTES) {
      const chunk = Buffer.alloc(Math.min(SCAN_CHUNK_BYTES, end - pos));
      const read = readSync(fd, chunk, 0, chunk.length, pos);
      const split = splitAtLastNewline(Buffer.concat([carry, chunk.subarray(0, read)]));
      carry = split.partial;
      for (const line of split.complete.split('\n')) {
        const event = parseLine(line);
        if (event) onEvent(event);
      }
      if (read < chunk.length) break;
    }
  } finally {
    closeSync(fd);
  }
}

export interface ChunkSplit {
  /** Text of the complete (newline-terminated) lines. */
  complete: string;
  /** Bytes after the last newline: a line still being written. */
  partial: Buffer;
}

export function splitAtLastNewline(data: Buffer): ChunkSplit {
  const lastBreak = data.lastIndexOf(NEWLINE);
  if (lastBreak < 0) {
    return { complete: '', partial: data };
  }
  return {
    complete: data.subarray(0, lastBreak).toString('utf8'),
    partial: Buffer.from(data.subarray(lastBreak + 1)),
  };
}
