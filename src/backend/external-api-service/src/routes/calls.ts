import { Router, Request, Response } from 'express';
import * as callService from '../services/callService';
import { TelephonyError } from '../services/callService';
import * as tripService from '../services/tripService';
import { cacheGet, driverLastCallKey } from '../cache/redis';
import { config } from '../config';
import { authHeaders } from '../services/serviceToken';
import { markCallConsentGranted, requestCallConsent } from '../services/zalo';
import type { TelephonyChannel } from '../services/telephony';

const router = Router();

function telephonyErrorStatus(err: unknown): number {
  if (err instanceof TelephonyError) {
    if (err.code === 'CONSENT_REQUIRED') return 403;
    if (err.code === 'INVALID_TARGET') return 400;
    if (err.code === 'CONFIG') return 503;
  }
  return 503;
}

router.post('/zalo/request-consent', async (req: Request, res: Response) => {
  try {
    const phone = (req.body.phone as string)?.trim();
    if (!phone) return res.status(400).json({ detail: 'phone is required' });
    const result = await requestCallConsent(phone);
    if (!result.ok) return res.status(result.cached ? 200 : 503).json(result);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ detail: String(err) });
  }
});

/** Dev/webhook: mark consent granted after user accepts on Zalo. */
router.post('/zalo/mark-consent', async (req: Request, res: Response) => {
  try {
    const phone = (req.body.phone as string)?.trim();
    if (!phone) return res.status(400).json({ detail: 'phone is required' });
    await markCallConsentGranted(phone);
    return res.json({ ok: true, phone });
  } catch (err) {
    return res.status(500).json({ detail: String(err) });
  }
});

router.post('/start', async (req: Request, res: Response) => {
  try {
    const {
      driverId,
      customerId = '',
      tripId = '',
      phoneNumber,
      mode = 'bridge',
      roomName = '',
      channel,
      zaloUid,
    } = req.body;
    let phone = (phoneNumber as string)?.trim() ?? '';

    if (tripId) {
      const { get } = await import('../services/tripService');
      const trip = await get(tripId as string);
      // A call tied to a trip ALWAYS dials the phone entered when the trip was
      // booked (trip.customer_phone) — never the caller-supplied `phoneNumber`,
      // and never the customer's account/login phone. Those routinely differ:
      // someone books a ride for another person, or from an account whose
      // login number isn't the passenger's. Hard-fail rather than silently
      // fall back to whatever the client sent.
      if (!trip) return res.status(404).json({ detail: `Trip ${tripId} not found` });
      if (!trip.customer_phone) {
        return res.status(400).json({ detail: `Trip ${tripId} has no customer phone on file` });
      }
      phone = trip.customer_phone;
    }

    if (!phone) return res.status(400).json({ detail: 'tripId or phoneNumber is required' });

    const result = await callService.startCustomerCall({
      driverPhone: driverId as string,
      customerPhone: phone,
      tripId: tripId as string,
      mode: mode as string,
      roomName: roomName as string,
      lang: (req.body.lang as string) || 'vn',
      customerName: (req.body.customerName as string) || '',
      pickupAddress: (req.body.pickupAddress as string) || '',
      customMessage: (req.body.customMessage as string) || '',
      retryAttempt: Math.min(Math.max(Number(req.body.retryAttempt) || 0, 0), 2),
      channel: channel as TelephonyChannel | undefined,
      zaloUid: (zaloUid as string) || undefined,
    });
    return res.json(result);
  } catch (err) {
    const msg = String(err);
    if (err instanceof TelephonyError) {
      return res.status(telephonyErrorStatus(err)).json({ detail: msg, code: err.code });
    }
    if (msg.includes('customer phone')) return res.status(400).json({ detail: msg });
    return res.status(503).json({ detail: msg });
  }
});

router.post('/call-driver', async (req: Request, res: Response) => {
  try {
    const { tripId, roomName, customerPhone = '' } = req.body;
    if (!tripId) return res.status(400).json({ detail: 'tripId is required' });
    if (!roomName) return res.status(400).json({ detail: 'roomName is required' });

    const trip = await tripService.get(tripId as string);
    if (!trip) return res.status(404).json({ detail: 'Trip not found' });
    if (!trip.driver_phone) return res.status(409).json({ detail: 'No driver assigned to this trip yet' });
    if (trip.status !== 'confirmed') {
      return res.status(409).json({ detail: `Driver has not confirmed this trip yet (status=${trip.status})` });
    }

    const result = await callService.startDriverCall({
      driverPhone: trip.driver_phone,
      customerPhone: (customerPhone as string) || trip.customer_phone,
      tripId: tripId as string,
      roomName: roomName as string,
    });
    return res.json(result);
  } catch (err) {
    return res.status(503).json({ detail: String(err) });
  }
});

router.post('/complete', async (req: Request, res: Response) => {
  try {
    const { driverPhone, callId, summary = '' } = req.body;
    if (!driverPhone || !callId) {
      return res.status(400).json({ detail: 'driverPhone and callId are required' });
    }
    await callService.completeCustomerCall(driverPhone as string, callId as string, summary as string);
    return res.json({ status: 'completed', call_id: callId, summary });
  } catch (err) {
    return res.status(500).json({ detail: String(err) });
  }
});

router.get('/latest', async (req: Request, res: Response) => {
  try {
    const driverPhone = req.headers['x-driver-phone'] as string;
    if (!driverPhone) return res.status(400).json({ detail: 'X-Driver-Phone header required' });

    const cached = await cacheGet<{
      call_id: string;
      summary?: string;
      status?: string;
      mode?: string;
    }>(driverLastCallKey(driverPhone));
    if (cached?.call_id) return res.json(cached);

    if (!config.callLoggerUrl) {
      return res.status(404).json({ detail: 'No recent call found' });
    }

    const resp = await fetch(
      `${config.callLoggerUrl.replace(/\/$/, '')}/api/v1/records?caller=${encodeURIComponent(driverPhone)}&limit=1`,
      { headers: authHeaders(), signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return res.status(404).json({ detail: 'No recent call found' });
    const records = (await resp.json()) as Array<{ call_id: string; summary?: string }>;
    if (!records.length) return res.status(404).json({ detail: 'No recent call found' });
    return res.json({ call_id: records[0].call_id, summary: records[0].summary || '' });
  } catch (err) {
    return res.status(404).json({ detail: 'No recent call found' });
  }
});

router.post('/:callId/summary', async (req: Request, res: Response) => {
  try {
    const callId = req.params.callId;
    if (!config.callLoggerUrl) {
      return res.status(404).json({ detail: 'Call summary not available' });
    }
    const resp = await fetch(
      `${config.callLoggerUrl.replace(/\/$/, '')}/api/v1/records/${encodeURIComponent(callId)}`,
      { headers: authHeaders(), signal: AbortSignal.timeout(5000) },
    );
    if (!resp.ok) return res.status(404).json({ detail: 'Call summary not available' });
    const record = (await resp.json()) as { summary?: string };
    return res.json({ summary: record.summary || '' });
  } catch (err) {
    return res.status(404).json({ detail: 'Call summary not available' });
  }
});

export default router;
