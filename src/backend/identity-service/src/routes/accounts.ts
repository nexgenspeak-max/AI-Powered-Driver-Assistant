import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import { authenticate } from '../middleware/authenticate';

const router = Router();

function sanitize(user: userService.User) {
  const { password_hash, refresh_token_hash, refresh_token_expires_at, ...safe } = user;
  return safe;
}

const VALID_STATUSES: userService.Status[] = ['online', 'offline', 'locked'];
const EDITABLE_FIELDS = ['name', 'fcm_token', 'vehicle_type', 'vehicle_plate', 'vehicle_name'] as const;

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.query.role as userService.Role | undefined;
    if (!role) return res.status(400).json({ detail: 'role query param is required' });
    const users = await userService.listByRole(role);
    return res.json(users.map(sanitize));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/phone/:phone', authenticate, async (req: Request, res: Response) => {
  try {
    const role = req.query.role as userService.Role | undefined;
    const user = await userService.getByPhone(req.params.phone, role);
    if (!user) return res.status(404).json({ detail: 'Account not found' });
    return res.json(sanitize(user));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const isSelf = req.user!.sub === req.params.id;
    const isAdmin = req.user!.role === 'admin';
    if (!isSelf && !isAdmin) return res.status(403).json({ detail: 'Not authorized to edit this account' });

    const body = req.body as Record<string, unknown> & { status?: userService.Status };
    const fields: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({ detail: `status must be one of ${VALID_STATUSES.join(', ')}` });
      }
      // Anyone can toggle their own online/offline; only admin can lock/unlock.
      if (body.status === 'locked' && !isAdmin) {
        return res.status(403).json({ detail: 'Only admin can lock an account' });
      }
      fields.status = body.status;
    }
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) fields[key] = body[key];
    }

    if (!Object.keys(fields).length) {
      const user = await userService.getById(req.params.id);
      if (!user) return res.status(404).json({ detail: 'Account not found' });
      return res.json(sanitize(user));
    }

    const updated = await userService.update(req.params.id, fields, req.user!.sub);
    if (!updated) return res.status(404).json({ detail: 'Account not found' });
    return res.json(sanitize(updated));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
