import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';
import { authenticate } from '../middleware/authenticate';
import * as settingsService from '../services/settingsService';
import bcrypt from 'bcryptjs';
import { canCreateAccount, canListAccounts, canManage } from '../services/accountAccess';

const router = Router();

function sanitize(user: userService.User) {
  const { password_hash, refresh_token_hash, refresh_token_expires_at, ...safe } = user;
  return safe;
}

const VALID_STATUSES: userService.Status[] = ['online', 'offline', 'locked'];
const EDITABLE_FIELDS = ['name', 'fcm_token', 'vehicle_type', 'vehicle_plate', 'vehicle_name'] as const;

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    if (!canListAccounts(req.user!.role as userService.Role)) {
      return res.status(403).json({ detail: 'Only staff accounts can list accounts' });
    }
    const role = req.query.role as userService.Role | undefined;
    if (!role) return res.status(400).json({ detail: 'role query param is required' });
    const users = await userService.listByRole(role);
    return res.json(users.map(sanitize));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Customers booked by phone or Zalo never register in an app, so the dispatcher
// (admin) creates their account here. Drivers still register via /auth/register.
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { role, name, phone, email, password } = req.body as {
      role?: userService.Role; name?: string; phone?: string; email?: string; password?: string;
    };
    if (!canCreateAccount(req.user!.role as userService.Role, role)) {
      return res.status(403).json({ detail: 'Not allowed to create this kind of account' });
    }
    if (role === 'admin') {
      // super_admin creates dispatcher accounts (public sign-up for admin is closed).
      if (!name || !email || !password) return res.status(400).json({ detail: 'name, email and password are required' });
      if (password.length < 10) return res.status(400).json({ detail: 'password must be at least 10 characters' });
      if (await userService.getByEmail(email, 'admin')) {
        return res.status(409).json({ detail: 'Email already registered', code: 'DUPLICATE_EMAIL' });
      }
      const admin = await userService.create({
        role, name, email: email.trim().toLowerCase(), password_hash: await bcrypt.hash(password, 10), permissions: ['*'],
      });
      await settingsService.create(admin.id);
      return res.status(201).json(sanitize(admin));
    }
    if (!name || !phone) return res.status(400).json({ detail: 'name and phone are required' });
    if (await userService.getByPhone(phone, 'customer')) {
      return res.status(409).json({ detail: 'A customer with this phone already exists', code: 'DUPLICATE_PHONE' });
    }
    const user = await userService.create({ role: 'customer', name, phone, ...(email ? { email } : {}), permissions: [] });
    await settingsService.create(user.id);
    return res.status(201).json(sanitize(user));
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
    let isAdmin = false;
    if (!isSelf) {
      const target = await userService.getById(req.params.id);
      if (!target) return res.status(404).json({ detail: 'Account not found' });
      // admin manages drivers/customers; super_admin manages dispatchers.
      isAdmin = canManage(req.user!.role as userService.Role, target.role);
      if (!isAdmin) return res.status(403).json({ detail: 'Not authorized to edit this account' });
    }

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
    if (body.phone !== undefined) {
      if (!isAdmin) return res.status(403).json({ detail: 'Only admin can change a phone number' });
      const current = await userService.getById(req.params.id);
      if (!current) return res.status(404).json({ detail: 'Account not found' });
      const clash = await userService.getByPhone(String(body.phone), current.role);
      if (clash && clash.id !== current.id) {
        return res.status(409).json({ detail: 'Another account of this role already uses this phone', code: 'DUPLICATE_PHONE' });
      }
      fields.phone = String(body.phone);
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

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'admin') return res.status(403).json({ detail: 'Only admin can delete accounts' });
    const user = await userService.getById(req.params.id);
    if (!user) return res.status(404).json({ detail: 'Account not found' });
    if (user.role !== 'customer') return res.status(400).json({ detail: 'only customer accounts can be deleted here' });
    await userService.remove(user.id);
    return res.status(204).end();
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
