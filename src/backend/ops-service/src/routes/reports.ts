import { Router, Request, Response } from 'express';
import { DATE_RE, buildDailyReport, getReport, listReports, vnDate } from '../services/reports';
import { getLogger } from '../services/logger';

const router = Router();
const log = getLogger('reports_route');

/** GET /api/v1/reports/daily?date=YYYY-MM-DD  |  ?from=…&to=…  (default: yesterday) */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';
    if (from || to) {
      if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
        res.status(400).json({ detail: 'from/to must be YYYY-MM-DD and from ≤ to' });
        return;
      }
      res.json(await listReports(from, to));
      return;
    }
    const date = typeof req.query.date === 'string' ? req.query.date : vnDate(-1);
    if (!DATE_RE.test(date)) {
      res.status(400).json({ detail: 'date must be YYYY-MM-DD' });
      return;
    }
    const report = await getReport(date);
    if (!report) {
      res.status(404).json({ detail: `No report for ${date}`, date });
      return;
    }
    res.json(report);
  } catch (err) {
    log.error('get failed', { ok: false, error: String(err) });
    res.status(500).json({ detail: 'report store unavailable' });
  }
});

/** POST /api/v1/reports/daily/:date/rebuild — recompute from call records (super admin). */
router.post('/daily/:date/rebuild', async (req: Request, res: Response) => {
  const { date } = req.params;
  if (!DATE_RE.test(date) || date > vnDate(0)) {
    res.status(400).json({ detail: 'date must be YYYY-MM-DD and not in the future' });
    return;
  }
  try {
    res.json(await buildDailyReport(date));
  } catch (err) {
    log.error('rebuild failed', { ok: false, date, error: String(err) });
    res.status(502).json({ detail: `rebuild failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

export default router;
