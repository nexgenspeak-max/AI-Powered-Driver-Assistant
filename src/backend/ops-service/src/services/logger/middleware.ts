import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { runWithLogContext } from './context';

function readRoom(req: Request): string {
  const body = req.body as Record<string, unknown> | undefined;
  if (typeof body?.room_name === 'string' && body.room_name) {
    return body.room_name;
  }
  if (typeof body?.room === 'string' && body.room) {
    return body.room;
  }
  const q = req.query as Record<string, unknown>;
  if (typeof q.room_name === 'string' && q.room_name) {
    return q.room_name;
  }
  if (typeof q.room === 'string' && q.room) {
    return q.room;
  }
  return '-';
}

function readConv(req: Request): string {
  const header = req.header('x-request-id') || req.header('x-correlation-id');
  if (header) {
    return header;
  }
  const body = req.body as Record<string, unknown> | undefined;
  if (typeof body?.CallSid === 'string' && body.CallSid) {
    return body.CallSid;
  }
  return randomUUID();
}

/** After express.json(). Isolates concurrent requests via AsyncLocalStorage. */
export function attachLogContext(req: Request, res: Response, next: NextFunction): void {
  const conv = readConv(req);
  res.setHeader('X-Request-Id', conv);
  runWithLogContext({ conv, room: readRoom(req) }, () => next());
}
