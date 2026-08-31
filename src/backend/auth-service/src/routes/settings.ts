import { Router, Request, Response } from 'express';
import * as settingsService from '../services/settingsService';
import { authenticate } from '../middleware/authenticate';

const router = Router();

const BOOLEAN_FIELDS = ['hands_free_mode', 'notify_on_pickup_approach', 'auto_suggest_next_stop'] as const;
const RADIUS_FIELDS = ['notify_on_pickup_approach_radius_m', 'auto_suggest_next_stop_radius_m'] as const;
const CALL_MODE_FIELDS = ['default_customer_call_mode'] as const;
const VALID_CALL_MODES = new Set(['agent', 'bridge']);

router.get('/:accountId', authenticate, async (req: Request, res: Response) => {
  const isSelf = req.user!.sub === req.params.accountId;
  const isAdmin = req.user!.role === 'admin';
  if (!isSelf && !isAdmin) return res.status(403).json({ detail: 'Not authorized to view these settings' });

  try {
    const settings = await settingsService.getByAccountId(req.params.accountId);
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/:accountId', authenticate, async (req: Request, res: Response) => {
  const isSelf = req.user!.sub === req.params.accountId;
  const isAdmin = req.user!.role === 'admin';
  if (!isSelf && !isAdmin) return res.status(403).json({ detail: 'Not authorized to edit these settings' });

  const body = req.body as Record<string, unknown>;
  const fields: Partial<settingsService.EditableSettings> = {};

  for (const key of BOOLEAN_FIELDS) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'boolean') {
        return res.status(400).json({ detail: `${key} must be a boolean` });
      }
      fields[key] = body[key] as boolean;
    }
  }
  for (const key of RADIUS_FIELDS) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'number' || !Number.isFinite(body[key]) || (body[key] as number) <= 0) {
        return res.status(400).json({ detail: `${key} must be a positive number` });
      }
      fields[key] = body[key] as number;
    }
  }
  for (const key of CALL_MODE_FIELDS) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || !VALID_CALL_MODES.has(body[key] as string)) {
        return res.status(400).json({ detail: `${key} must be "agent" or "bridge"` });
      }
      fields[key] = body[key] as settingsService.EditableSettings[typeof key];
    }
  }

  try {
    const updated = await settingsService.update(req.params.accountId, fields, req.user!.sub);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
