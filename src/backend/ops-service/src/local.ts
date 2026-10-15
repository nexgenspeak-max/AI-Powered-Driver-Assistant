import express from 'express';
import cors from 'cors';
import statusRouter from './routes/status';
import logsRouter from './routes/logs';
import recordsRouter from './routes/records';
import agentRouter from './routes/agent';
import reportsRouter from './routes/reports';
import tracesRouter from './routes/traces';
import { requireSuperAdmin } from './middleware/authenticate';
import { attachLogContext, getLogger } from './services/logger';
import { config } from './config';
import { startLocalScheduler } from './services/reports';

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

const log = getLogger('listen');
app.listen(config.port, () => log.info('listening', { port: config.port }));
if (process.env.REPORT_SCHEDULER !== 'off') startLocalScheduler();
