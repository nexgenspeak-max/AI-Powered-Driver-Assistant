import { Router, Request, Response } from 'express';
import * as callService from '../services/callService';

const router = Router();

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    if (!phoneNumber || !message) {
      return res.status(400).json({ detail: 'phoneNumber and message are required' });
    }
    const result = await callService.sendSms(phoneNumber, message);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
