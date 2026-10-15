import { Router, Request, Response } from 'express';
import * as callService from '../services/callService';
import * as twilioMonitor from '../services/twilioMonitor';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/send', authenticate, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return res.status(400).json({ detail: 'phoneNumber and message are required' });
    }
    const result = await callService.sendSms(phoneNumber, message);
    return res.json(result);
  } catch (err) {
    if (err instanceof callService.SmsSendError) {
      const status = err.httpStatus && err.httpStatus >= 400 && err.httpStatus < 500 ? 400 : 502;
      return res.status(status).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: String(err) });
  }
});

/** Twilio delivery receipt (StatusCallback of messages.create). */
router.post('/status', async (req: Request, res: Response) => {
  const b = req.body || {};
  await twilioMonitor.logEvent('sms_status', {
    MessageSid: String(b.MessageSid || ''),
    MessageStatus: String(b.MessageStatus || b.SmsStatus || ''),
    To: String(b.To || ''),
    ErrorCode: String(b.ErrorCode || ''),
  });
  return res.status(204).end();
});

export default router;
