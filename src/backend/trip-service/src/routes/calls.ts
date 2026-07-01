import { Router, Request, Response } from 'express';
import * as callService from '../services/callService';

const router = Router();

router.post('/start', async (req: Request, res: Response) => {
  try {
    const { driverId, customerId = '', tripId = '', phoneNumber, mode = 'bridge' } = req.body;
    let phone = (phoneNumber as string)?.trim() ?? '';

    if (tripId) {
      const { get } = await import('../services/tripService');
      const trip = await get(tripId as string);
      if (trip?.customer_phone) phone = trip.customer_phone;
    }

    if (!phone) return res.status(400).json({ detail: 'phoneNumber is required' });

    return res.json(await callService.startCustomerCall({
      driverPhone: driverId as string,
      customerPhone: phone,
      tripId: tripId as string,
      mode: mode as string,
    }));
  } catch (err) {
    const msg = String(err);
    if (msg.includes('customer phone')) return res.status(400).json({ detail: msg });
    return res.status(503).json({ detail: msg });
  }
});

router.get('/latest', (req: Request, res: Response) => {
  const driverPhone = req.headers['x-driver-phone'];
  if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });
  return res.status(404).json({ detail: 'No recent call found' });
});

router.post('/:callId/summary', (_req: Request, res: Response) => {
  return res.status(404).json({ detail: 'Call summary not available' });
});

export default router;
