import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import tripsRouter from './routes/trips';
import driversRouter from './routes/drivers';
import callsRouter from './routes/calls';
import voiceRouter from './routes/voice';

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Driver-Phone'],
  credentials: false,
};

const app = express();
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/trips', tripsRouter);
app.use('/api/v1/drivers', driversRouter);
app.use('/api/v1/calls', callsRouter);
app.use('/api/v1/voice', voiceRouter);

export const handler = serverless(app);
