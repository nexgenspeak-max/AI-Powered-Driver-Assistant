import { closeSync, openSync, readSync, statSync } from 'fs';
import type { LogServiceId } from '../../config';
import { lineMatches, type LogFilter } from './filter';
import { defaultLogDirs, resolveLogFiles, type LogDirs } from './sources';

/** Bytes read from the end of each file for a snapshot. */
const SNAPSHOT_TAIL_BYTES = 2 * 1024 * 1024;
const TAIL_POLL_MS = 1000;
const NEWLINE = 0x0a;
const LINE_TS = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

function sizeOf(file: string): number {
  try {
    return statSync(file).size;
  } catch {
    return -1;
  }
}

function readRange(file: string, start: number, end: number): Buffer {
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

function splitLines(buffer: Buffer): string[] {
  return buffer
    .toString('utf8')
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

/** Last complete lines of one file; a line cut by the read window is dropped. */
function tailOfFile(file: string): string[] {
  const size = sizeOf(file);
  if (size <= 0) {
    return [];
  }
  const start = Math.max(0, size - SNAPSHOT_TAIL_BYTES);
  let chunk = readRange(file, start, size);
  if (start > 0) {
    const firstBreak = chunk.indexOf(NEWLINE);
    chunk = firstBreak >= 0 ? chunk.subarray(firstBreak + 1) : Buffer.alloc(0);
  }
  return splitLines(chunk);
}

interface TimedLine {
  ts: string;
  line: string;
}

/** Continuation lines (tracebacks) inherit the timestamp of the line above. */
function withTimestamps(lines: string[]): TimedLine[] {
  let ts = '';
  return lines.map((line) => {
    const match = LINE_TS.exec(line);
    if (match) {
      ts = match[0].replace('T', ' ');
    }
    return { ts, line };
  });
}

/** The newest `limit` matching lines across the service's files, oldest first. */
export function snapshotLines(
  service: LogServiceId | undefined,
  filter: LogFilter,
  limit: number,
  dirs: LogDirs = defaultLogDirs(),
): string[] {
  const merged = resolveLogFiles(service, dirs)
    .flatMap((file) => withTimestamps(tailOfFile(file)))
    .filter((entry) => lineMatches(entry.line, filter));
  // Array#sort is stable, so lines with equal timestamps keep file order.
  const sorted = [...merged].sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  return sorted.slice(-limit).map((entry) => entry.line);
}

interface TailState {
  offset: number;
  partial: Buffer;
}

/**
 * Calls `onLine` for each new matching line appended to the service's files.
 * Files that appear after the tail starts (a new worker pid) are read from the top.
 */
export function tailMatching(
  service: LogServiceId | undefined,
  filter: LogFilter,
  onLine: (line: string) => void,
  dirs: LogDirs = defaultLogDirs(),
  pollMs: number = TAIL_POLL_MS,
): { stop: () => void } {
  const states = new Map<string, TailState>(
    resolveLogFiles(service, dirs).map((file) => [file, { offset: Math.max(0, sizeOf(file)), partial: Buffer.alloc(0) }]),
  );

  const readNew = (file: string, prev: TailState): TailState => {
    const size = sizeOf(file);
    if (size < 0) {
      return prev;
    }
    const truncated = size < prev.offset;
    const from = truncated ? 0 : prev.offset;
    const carried = truncated ? Buffer.alloc(0) : prev.partial;
    if (size === from) {
      return { offset: from, partial: carried };
    }
    const data = Buffer.concat([carried, readRange(file, from, size)]);
    const lastBreak = data.lastIndexOf(NEWLINE);
    if (lastBreak < 0) {
      return { offset: size, partial: data };
    }
    for (const line of splitLines(data.subarray(0, lastBreak))) {
      if (lineMatches(line, filter)) {
        onLine(line);
      }
    }
    return { offset: size, partial: Buffer.from(data.subarray(lastBreak + 1)) };
  };

  const tick = () => {
    try {
      // Oldest file first, so a new worker's lines follow the ones before it.
      for (const file of [...resolveLogFiles(service, dirs)].reverse()) {
        const prev = states.get(file) ?? { offset: 0, partial: Buffer.alloc(0) };
        states.set(file, readNew(file, prev));
      }
    } catch {
      // A file can vanish mid-read during rotation; the next tick re-resolves.
    }
  };

  const timer = setInterval(tick, pollMs);
  return { stop: () => clearInterval(timer) };
}
