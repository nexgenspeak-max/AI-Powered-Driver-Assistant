import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { forEachEvent } from './events';
import { defaultTracesDir, roomOfFile } from './paths';
import { createSessionScanner, type TraceSessionStats } from './stats';

export interface TraceSessionSummary {
  room: string;
  mode: string | null;
  lang: string | null;
  participant: string | null;
  /** session_start ts in ms; file birth/mtime when the first line is missing. */
  startedAt: number;
  updatedAt: number;
  turns: number;
  llmCalls: number;
  ended: boolean;
  sizeBytes: number;
  stats: TraceSessionStats;
}

export interface ListOptions {
  limit?: number;
  /** Only sessions whose session_start mode equals this. */
  mode?: string;
  dir?: string;
}

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

interface FileStat {
  room: string;
  file: string;
  size: number;
  mtimeMs: number;
  birthtimeMs: number;
}

/** Summaries keyed by file; reused while size and mtime are unchanged (the list refetches every few seconds). */
const cache = new Map<string, { size: number; mtimeMs: number; summary: TraceSessionSummary }>();

function str(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

/** Streams the file once; a last line still being written is left for the next refresh. */
function summariseFile(stat: FileStat): TraceSessionSummary {
  const scanner = createSessionScanner();
  forEachEvent(stat.file, stat.size, scanner.add);
  const { head, turns, llmCalls, ended, stats } = scanner.result();
  const start = head?.kind === 'session_start' ? head : null;
  return {
    room: stat.room,
    mode: str(start?.mode),
    lang: str(start?.lang),
    participant: str(start?.participant),
    startedAt: start ? Math.round(start.ts * 1000) : Math.round(stat.birthtimeMs || stat.mtimeMs),
    updatedAt: Math.round(stat.mtimeMs),
    turns,
    llmCalls,
    ended,
    sizeBytes: stat.size,
    stats,
  };
}

function cachedSummary(stat: FileStat): TraceSessionSummary {
  const hit = cache.get(stat.file);
  if (hit && hit.size === stat.size && hit.mtimeMs === stat.mtimeMs) {
    return hit.summary;
  }
  const summary = summariseFile(stat);
  cache.set(stat.file, { size: stat.size, mtimeMs: stat.mtimeMs, summary });
  return summary;
}

function statFiles(dir: string): FileStat[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const stats: FileStat[] = [];
  for (const name of names) {
    const room = roomOfFile(name);
    if (!room) continue;
    const file = join(dir, name);
    try {
      const st = statSync(file);
      if (st.isFile()) {
        stats.push({ room, file, size: st.size, mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs });
      }
    } catch {
      // Deleted between readdir and stat.
    }
  }
  return stats;
}

function capLimit(limit: number | undefined): number {
  return Math.min(Math.max(1, Math.floor(limit ?? DEFAULT_LIST_LIMIT) || DEFAULT_LIST_LIMIT), MAX_LIST_LIMIT);
}

/** Newest sessions first (by file mtime). */
export function listSessions(options: ListOptions = {}): TraceSessionSummary[] {
  const limit = capLimit(options.limit);
  const sorted = statFiles(options.dir ?? defaultTracesDir()).sort((a, b) => b.mtimeMs - a.mtimeMs);
  const out: TraceSessionSummary[] = [];
  for (const stat of sorted) {
    if (out.length >= limit) break;
    const summary = cachedSummary(stat);
    if (!options.mode || summary.mode === options.mode) out.push(summary);
  }
  return out;
}
