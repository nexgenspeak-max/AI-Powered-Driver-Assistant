import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import statusRouter from './routes/status';
import logsRouter from './routes/logs';
import recordsRouter from './routes/records';
import agentRouter from './routes/agent';
import reportsRouter from './routes/reports';
import tracesRouter from './routes/traces';
import { buildDailyReport, vnDate } from './services/reports';
import { requireSuperAdmin } from './middleware/authenticate';
import { attachLogContext } from './services/logger';

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
};

const app = express();
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(attachLogContext);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', requireSuperAdmin);
app.use('/api/v1/status', statusRouter);
app.use('/api/v1/logs', logsRouter);
app.use('/api/v1/records', recordsRouter);
app.use('/api/v1/agent', agentRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/traces', tracesRouter);

export default app;

const http = serverless(app);

/** Input sent by the EventBridge Scheduler (infra/ops-service/sam.yaml). */
interface ScheduledInput {
  source: 'ops.schedule';
  action: 'daily-report';
  date?: string;
}

function isScheduled(event: unknown): event is ScheduledInput {
  return (event as ScheduledInput)?.source === 'ops.schedule';
}

/** Lambda entry: API Gateway requests, or the daily scheduled report build. */
export const handler = async (event: unknown, context: unknown) => {
  if (isScheduled(event)) {
    const report = await buildDailyReport(event.date ?? vnDate(-1));
    return { status: 'ok', report_date: report.report_date, sessions: report.activity.sessions };
  }
  return http(event as Parameters<typeof http>[0], context as Parameters<typeof http>[1]);
};
