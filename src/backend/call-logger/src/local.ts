import express from 'express';
import cors from 'cors';
import recordsRouter from './routes/records';
import { attachLogContext, getLogger } from './services/logger';

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
app.use('/api/v1/records', recordsRouter);

const PORT = process.env.PORT || 8001;
const log = getLogger('listen');
app.listen(PORT, () => log.info('listening', { port: PORT }));
