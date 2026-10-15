import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { deliverDueReminders } from './services/reminderDelivery';
import tripsRouter from './routes/trips';
import driversRouter from './routes/drivers';
import callsRouter from './routes/calls';
import smsRouter from './routes/sms';
import voiceRouter from './routes/voice';
import remindersRouter from './routes/reminders';
import customersRouter from './routes/customers';
import placesRouter from './routes/places';
import { authenticate } from './middleware/authenticate';
import { cacheGet } from './cache/redis';
import { attachLogContext } from './services/logger';

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Driver-Phone', 'X-Customer-Phone'],
  credentials: false,
};

const app = express();
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(attachLogContext);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', authenticate);
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/drivers', driversRouter);
app.use('/api/v1/calls', callsRouter);
app.use('/api/v1/sms', smsRouter);
app.use('/api/v1/voice', voiceRouter);
app.use('/api/v1/reminders', remindersRouter);
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/places', placesRouter);

void cacheGet('__warmup__');

const http = serverless(app);

/** EventBridge Scheduler input for the pickup-reminder tick (infra/external-api-service/sam.yaml). */
function isReminderTick(event: unknown): boolean {
  const e = event as { source?: string; action?: string } | null;
  return e?.source === 'external-api.schedule' && e?.action === 'reminders';
}

/** Lambda entry: API Gateway requests, or the one-minute reminder tick (two sweeps, 30 s apart). */
export const handler = async (event: unknown, context: unknown) => {
  if (isReminderTick(event)) {
    const first = await deliverDueReminders();
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    const second = await deliverDueReminders();
    return { status: 'ok', delivered: first + second };
  }
  return http(event as Parameters<typeof http>[0], context as Parameters<typeof http>[1]);
};
