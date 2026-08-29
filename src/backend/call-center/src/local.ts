import express from 'express';
import callsRouter from './routes/calls';
import smsRouter from './routes/sms';
import { attachLogContext, getLogger } from './services/logger';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(attachLogContext);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/calls', callsRouter);
app.use('/api/v1/sms', smsRouter);

const PORT = process.env.PORT || 8000;
const log = getLogger('listen');
app.listen(PORT, () => log.info('listening', { port: PORT }));
