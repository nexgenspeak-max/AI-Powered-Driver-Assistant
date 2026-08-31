import express from 'express';
import cors from 'cors';
import statusRouter from './routes/status';
import logsRouter from './routes/logs';
import recordsRouter from './routes/records';
import agentRouter from './routes/agent';
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

export default app;
