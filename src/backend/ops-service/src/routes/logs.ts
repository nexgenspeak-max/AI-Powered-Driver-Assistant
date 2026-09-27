import { Router, Request, Response } from 'express';
import { isLogServiceId, snapshotLines, tailMatching } from '../services/logs';
import { cloudwatchLines } from '../services/logs/cloudwatch';
import { config } from '../config';
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

router.get('/', async (req: Request, res: Response) => {
  const filter = readFilter(req);
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  try {
    const lines = config.logSource === 'cloudwatch'
      ? (await cloudwatchLines(filter.service, filter, limit)).lines
      : snapshotLines(filter.service, filter, limit);
    log.info('snapshot', { ok: true, count: lines.length });
    res.json({ lines });
  } catch (err) {
    log.error('snapshot failed', { ok: false, error: String(err) });
    res.status(502).json({ detail: 'log source unavailable' });
  }
});

router.get('/stream', async (req: Request, res: Response) => {
  const filter = readFilter(req);
  if (config.logSource === 'cloudwatch') {
    // API Gateway REST cannot hold a stream open. Reply with the new lines and
    // close; EventSource reconnects after `retry` ms and sends Last-Event-ID,
    // which turns the stream into polling with no duplicates.
    const since = Number(req.headers['last-event-id']) || Date.now() - 5 * 60 * 1000;
    try {
      const { lines, lastTs } = await cloudwatchLines(filter.service, filter, 200, since + 1);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      const body = ['retry: 5000', ...lines.map((line) => `data: ${JSON.stringify({ line })}\n`), `id: ${lastTs}`, ''].join('\n');
      res.send(`${body}\n`);
    } catch (err) {
      log.error('stream poll failed', { ok: false, error: String(err) });
      res.status(502).json({ detail: 'log source unavailable' });
    }
    return;
  }
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
