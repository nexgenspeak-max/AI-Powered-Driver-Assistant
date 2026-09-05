import { Router, Request, Response } from 'express';
import * as deliveryOrderService from '../services/deliveryOrderService';
import * as imageExtractionService from '../services/imageExtractionService';
import { invalidateDriverContext } from '../services/driverContextService';
import { DeliveryOrderStatus } from '../services/deliveryOrderService';

const router = Router();

// Last-mile delivery lifecycle — driver-driven, no counterparty role like
// trips' customer-vs-driver split (see deliveryOrderService.ts's
// DeliveryOrderStatus comment for the plain-English version of this graph).
const ALLOWED_TRANSITIONS: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
  pending: ['picked_up'],
  picked_up: ['delivering'],
  delivering: ['delivered', 'redelivery', 'returned'],
  redelivery: ['delivering', 'returned'],
  delivered: [],
  returned: [],
};

// Service callers (admin) can act on behalf of any driver via X-Driver-Phone
// (same header the drivers.ts /me/* routes read); a real driver session is
// always bound to its own phone from the JWT — same bypass shape as
// trips.ts's isTripOwner.
function resolveDriverPhone(req: Request): string | undefined {
  if (req.user?.role === 'driver') return req.user.phone;
  const header = req.headers['x-driver-phone'];
  return header ? String(header) : undefined;
}

function isOwner(req: Request, order: deliveryOrderService.DeliveryOrder): boolean {
  const user = req.user;
  if (!user || user.role === 'admin') return true;
  return user.role === 'driver' && !!user.phone && user.phone === order.driver_phone;
}

// Reads a driver-taken photo with the vision model and hands back the fields
// it found — nothing is persisted here. The driver reviews/edits the result
// in the app and only POST / actually creates the order.
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const imageBase64 = req.body.image_base64;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ detail: 'image_base64 is required' });
    }
    const extracted = await imageExtractionService.extractDeliveryInfo(imageBase64, req.body.mime_type);
    return res.json({ extracted });
  } catch (err) {
    return res.status(502).json({ detail: `Failed to read delivery photo: ${String(err)}` });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const driverPhone = resolveDriverPhone(req);
    if (!driverPhone) {
      return res.status(400).json({ detail: 'driver_phone could not be resolved (missing X-Driver-Phone header or driver session)' });
    }
    if (!req.body.recipient_phone || !req.body.recipient_address) {
      return res.status(400).json({ detail: 'recipient_phone and recipient_address are required' });
    }
    const order = await deliveryOrderService.create({ ...req.body, driver_phone: driverPhone });
    await invalidateDriverContext(driverPhone);
    return res.status(201).json(order);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const driverPhone = req.user?.role === 'driver'
      ? req.user.phone
      : (req.query.driver_phone ? String(req.query.driver_phone) : resolveDriverPhone(req));
    if (!driverPhone) return res.status(400).json({ detail: 'driver_phone is required' });
    return res.json(await deliveryOrderService.listByDriver(driverPhone, limit));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const order = await deliveryOrderService.get(req.params.orderId);
    if (!order) return res.status(404).json({ detail: 'Delivery order not found' });
    if (!isOwner(req, order)) return res.status(403).json({ detail: 'Not authorized to view this order' });
    return res.json(order);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/:orderId', async (req: Request, res: Response) => {
  try {
    const status = req.body.status as DeliveryOrderStatus;
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, status)) {
      return res.status(400).json({ detail: `status must be one of ${Object.keys(ALLOWED_TRANSITIONS).join(', ')}` });
    }
    const order = await deliveryOrderService.get(req.params.orderId);
    if (!order) return res.status(404).json({ detail: 'Delivery order not found' });
    if (!isOwner(req, order)) return res.status(403).json({ detail: 'Not authorized to modify this order' });

    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
      return res.status(409).json({ detail: `Cannot set status=${status} from status=${order.status}` });
    }
    const updated = await deliveryOrderService.updateStatus(req.params.orderId, status);
    await invalidateDriverContext(order.driver_phone);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.delete('/:orderId', async (req: Request, res: Response) => {
  try {
    const order = await deliveryOrderService.get(req.params.orderId);
    if (!order) return res.status(404).json({ detail: 'Delivery order not found' });
    if (!isOwner(req, order)) return res.status(403).json({ detail: 'Not authorized to delete this order' });
    await deliveryOrderService.remove(req.params.orderId);
    await invalidateDriverContext(order.driver_phone);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
