import { Router, Request, Response } from 'express';
import { isLogServiceId, snapshotLines, tailMatching } from '../services/logs';
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('logs');

function readFilter(req: Request) {
  const serviceRaw = typeof req.query.service === 'string' ? req.query.service : '';
  const service = serviceRaw && isLogServiceId(serviceRaw) ? serviceRaw : undefined;
  const room = typeof req.query.room === 'string' ? req.query.room : undefined;
  const conv = typeof req.query.conv === 'string' ? req.query.conv : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  return { service, room, conv, q };
}

router.get('/', (req: Request, res: Response) => {
  const filter = readFilter(req);
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const lines = snapshotLines(filter.service, filter, limit);
  log.info('snapshot', { ok: true, count: lines.length });
  res.json({ lines });
});

router.get('/stream', (req: Request, res: Response) => {
  const filter = readFilter(req);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  log.info('stream open', { ok: true, service: filter.service || '-' });

  const send = (line: string) => {
    res.write(`data: ${JSON.stringify({ line })}\n\n`);
  };

  for (const line of snapshotLines(filter.service, filter, 200)) {
    send(line);
  }

  const { stop } = tailMatching(filter.service, filter, send);
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15_000);

  req.on('close', () => {
    stop();
    clearInterval(heartbeat);
    log.info('stream close', { ok: true });
  });
});

export default router;
