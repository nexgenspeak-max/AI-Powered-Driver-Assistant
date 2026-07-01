import express from 'express';
import serverless from 'serverless-http';
import callsRouter from './routes/calls';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/calls', callsRouter);

export const handler = serverless(app);
