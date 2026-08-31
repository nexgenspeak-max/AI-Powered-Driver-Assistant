import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import tripsRouter from './routes/trips';
import driversRouter from './routes/drivers';
import callsRouter from './routes/calls';
import smsRouter from './routes/sms';
import voiceRouter from './routes/voice';
import remindersRouter from './routes/reminders';
import customersRouter from './routes/customers';
import deliveryOrdersRouter from './routes/deliveryOrders';
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
// Delivery-order photos travel here as base64 JSON, well past Express's 100kb
// default — raised to cover a compressed phone-camera photo with headroom.
app.use(express.json({ limit: '15mb' }));
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
app.use('/api/v1/delivery-orders', deliveryOrdersRouter);
app.use('/api/v1/places', placesRouter);

void cacheGet('__warmup__');

export const handler = serverless(app);
