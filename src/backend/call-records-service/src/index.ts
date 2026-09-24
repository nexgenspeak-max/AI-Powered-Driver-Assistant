import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import recordsRouter from './routes/records';
import { authenticate } from './middleware/authenticate';
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
app.use('/api/v1', authenticate);
app.use('/api/v1/records', recordsRouter);

export const handler = serverless(app);
