import express from 'express';
import cors from 'cors';
import recordsRouter from './routes/records';

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
app.use('/api/v1/records', recordsRouter);

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => console.log(`call-logger running on :${PORT}`));
