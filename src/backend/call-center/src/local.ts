import express from 'express';
import callsRouter from './routes/calls';
import smsRouter from './routes/sms';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/calls', callsRouter);
app.use('/api/v1/sms', smsRouter);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`call-center running on :${PORT}`));
