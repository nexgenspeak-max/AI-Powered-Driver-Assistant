import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import settingsRouter from './routes/settings';

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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/settings', settingsRouter);

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => console.log(`auth-service running on :${PORT}`));
