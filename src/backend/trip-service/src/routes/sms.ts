import { Router, Request, Response } from 'express';
import * as tripService from '../services/tripService';
import * as smsService from '../services/smsService';

const router = Router();

router.post('/send', async (req: Request, res: Response) => {
  try {
    const { tripId = '', message } = req.body;
    let phone = (req.body.phoneNumber as string)?.trim() ?? '';

    if (tripId) {
      const trip = await tripService.get(tripId as string);
      if (trip?.customer_phone) phone = trip.customer_phone;
    }

    if (!phone) return res.status(400).json({ detail: 'phoneNumber is required' });
    if (!message) return res.status(400).json({ detail: 'message is required' });

    const result = await smsService.sendSms(phone, message as string);
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ detail: String(err) });
  }
});

export default router;
