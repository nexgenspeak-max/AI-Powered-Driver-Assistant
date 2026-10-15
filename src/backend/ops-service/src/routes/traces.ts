import { Router, Request, Response } from 'express';
import {
  DEFAULT_LIST_LIMIT,
  isValidRoom,
  listSessions,
  readSession,
  tailSession,
  type SessionSnapshot,
  type TraceEvent,
} from '../services/traces';
import { getLogger } from '../services/logger';

/** Per-session LLM traces (`<llm-orchestrator logs>/traces/<room>.jsonl`), local/dev only. */
const router = Router();
const log = getLogger('traces_route');

const HEARTBEAT_MS = 15_000;

function lastEventSeq(req: Request): number | undefined {
  const raw = req.headers['last-event-id'];
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return raw !== undefined && Number.isInteger(value) ? value : undefined;
}

router.get('/', (req: Request, res: Response) => {
  const t0 = Date.now();
  try {
    const mode = typeof req.query.mode === 'string' && req.query.mode ? req.query.mode : undefined;
    const sessions = listSessions({ limit: Number(req.query.limit) || DEFAULT_LIST_LIMIT, mode });
    log.info('list', { ok: true, count: sessions.length, mode: mode ?? '-', duration_ms: Date.now() - t0 });
    res.json(sessions);
  } catch (err) {
    log.error('list failed', { ok: false, error: String(err), duration_ms: Date.now() - t0 });
    res.status(500).json({ detail: 'trace directory unreadable' });
  }
});

router.get('/:room', (req: Request, res: Response) => {
  const t0 = Date.now();
  const { room } = req.params;
  if (!isValidRoom(room)) {
    log.warning('get rejected', { ok: false, error: 'invalid room' });
    res.status(400).json({ detail: 'Invalid room' });
    return;
  }
  try {
    const snapshot = readSession(room);
    if (!snapshot) {
      log.info('get missing', { ok: false, trace_room: room, duration_ms: Date.now() - t0 });
      res.status(404).json({ detail: 'Trace not found' });
      return;
    }
    log.info('get', { ok: true, trace_room: room, count: snapshot.events.length, duration_ms: Date.now() - t0 });
    res.json({ room, events: snapshot.events });
  } catch (err) {
    log.error('get failed', { ok: false, trace_room: room, error: String(err), duration_ms: Date.now() - t0 });
    res.status(500).json({ detail: 'trace unreadable' });
  }
});

router.get('/:room/stream', (req: Request, res: Response) => {
  const { room } = req.params;
  if (!isValidRoom(room)) {
    log.warning('stream rejected', { ok: false, error: 'invalid room' });
    res.status(400).json({ detail: 'Invalid room' });
    return;
  }
  const afterSeq = lastEventSeq(req);
  let snapshot: SessionSnapshot | null;
  try {
    snapshot = readSession(room, { afterSeq });
  } catch (err) {
    log.error('stream failed', { ok: false, trace_room: room, error: String(err) });
    res.status(500).json({ detail: 'trace unreadable' });
    return;
  }
  if (!snapshot) {
    log.info('stream missing', { ok: false, trace_room: room });
    res.status(404).json({ detail: 'Trace not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const t0 = Date.now();
  let sent = 0;
  let lastSeq = afterSeq ?? -1;
  const send = (event: TraceEvent) => {
    lastSeq = Math.max(lastSeq, event.seq);
    sent += 1;
    res.write(`id: ${event.seq}\nevent: trace\ndata: ${JSON.stringify(event)}\n\n`);
  };

  snapshot.events.forEach(send);
  log.info('stream open', { ok: true, trace_room: room, resumed: afterSeq !== undefined, replayed: sent });

  const { stop } = tailSession(room, send, { fromOffset: snapshot.offset, afterSeq: lastSeq });
  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);

  req.on('close', () => {
    stop();
    clearInterval(heartbeat);
    log.info('stream close', { ok: true, trace_room: room, sent, duration_ms: Date.now() - t0 });
  });
});

export default router;
