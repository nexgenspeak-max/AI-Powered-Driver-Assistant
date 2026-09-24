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
      // Same rule as /calls/start: an SMS tied to a trip always goes to the
      // phone entered when booking (trip.customer_phone), never the
      // client-supplied number or the account phone.
      if (!trip) return res.status(404).json({ detail: `Trip ${tripId} not found` });
      if (!trip.customer_phone) {
        return res.status(400).json({ detail: `Trip ${tripId} has no customer phone on file` });
      }
      phone = trip.customer_phone;
    }

    if (!phone) return res.status(400).json({ detail: 'tripId or phoneNumber is required' });
    if (!message) return res.status(400).json({ detail: 'message is required' });

    const result = await smsService.sendSms(phone, message as string);
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ detail: String(err) });
  }
});

export default router;
