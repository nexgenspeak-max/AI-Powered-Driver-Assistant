import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as userService from '../services/userService';
import {
  signAccessToken, signRefreshToken, verifyToken, hashToken, durationFromNow, TokenClaims,
} from '../services/tokenService';
import { authenticate } from '../middleware/authenticate';
import { config } from '../config';

const router = Router();

const DEFAULT_PERMISSIONS: Record<userService.Role, string[]> = {
  admin: ['*'],
  driver: ['trip:read', 'trip:update:own'],
  customer: ['trip:read:own', 'trip:create'],
};

function toClaims(user: userService.User): TokenClaims {
  return {
    sub: user.id,
    role: user.role,
    permissions: user.permissions,
    name: user.name,
    phone: user.phone,
    email: user.email,
  };
}

function sanitize(user: userService.User) {
  const { password_hash, refresh_token_hash, refresh_token_expires_at, ...safe } = user;
  return safe;
}

async function issueTokens(user: userService.User) {
  const claims = toClaims(user);
  const access_token = signAccessToken(claims);
  const refresh_token = signRefreshToken(claims);

  await userService.update(user.id, {
    refresh_token_hash: hashToken(refresh_token),
    refresh_token_expires_at: durationFromNow(config.jwtRefreshExpiresIn),
  }, user.id);

  return { access_token, refresh_token, user: sanitize(user) };
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { role, name, phone, email, password, vehicle_type, vehicle_plate, vehicle_name } = req.body as {
      role: userService.Role; name: string; phone?: string; email?: string; password?: string;
      vehicle_type?: string; vehicle_plate?: string; vehicle_name?: string;
    };
    if (!role || !name) return res.status(400).json({ detail: 'role and name are required' });

    if (role === 'admin') {
      if (!email || !password) return res.status(400).json({ detail: 'email and password are required for admin' });
      if (await userService.getByEmail(email, 'admin')) return res.status(409).json({ detail: 'Email already registered' });
      const password_hash = await bcrypt.hash(password, 10);
      const user = await userService.create({
        role, name, email, password_hash, permissions: DEFAULT_PERMISSIONS.admin,
      });
      return res.status(201).json(await issueTokens(user));
    }

    if (!phone) return res.status(400).json({ detail: 'phone is required' });
    if (!email || !password) {
      return res.status(400).json({ detail: 'email and password are required' });
    }
    if (role === 'driver' && (!vehicle_type || !vehicle_plate || !vehicle_name)) {
      return res.status(400).json({ detail: 'vehicle_type, vehicle_plate and vehicle_name are required for driver' });
    }
    const password_hash = await bcrypt.hash(password, 10);

    // Scoped to this role: the same phone can hold a separate driver account and a
    // separate customer account — registering one must never overwrite the other.
    const existing = await userService.getByPhone(phone, role);
    if (existing) {
      const updated = await userService.update(existing.id, {
        name, email, password_hash,
        ...(role === 'driver' ? { vehicle_type, vehicle_plate, vehicle_name } : {}),
      }) as userService.User;
      return res.status(201).json(await issueTokens(updated));
    }

    const user = await userService.create({
      role, name, phone, email, password_hash, permissions: DEFAULT_PERMISSIONS[role],
      ...(role === 'driver' ? { vehicle_type, vehicle_plate, vehicle_name } : {}),
    });
    return res.status(201).json(await issueTokens(user));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { role, phone, email, password } = req.body as {
      role: userService.Role; phone?: string; email?: string; password?: string;
    };
    if (!role) return res.status(400).json({ detail: 'role is required' });

    if (role === 'admin') {
      if (!email || !password) return res.status(400).json({ detail: 'email and password are required' });
      const user = await userService.getByEmail(email, 'admin');
      if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ detail: 'Invalid credentials' });
      }
      if (user.status === 'locked') return res.status(403).json({ detail: 'Account is locked' });
      return res.json(await issueTokens(user));
    }

    // driver / customer: phone-based login, scoped to the role of the app that's
    // calling — a phone registered as a customer must never log in as a driver, and
    // vice versa, since one person can hold both account types on the same phone.
    if (!phone || !password) return res.status(400).json({ detail: 'phone and password are required' });
    const user = await userService.getByPhone(phone, role);
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    if (user.status === 'locked') return res.status(403).json({ detail: 'Account is locked' });
    return res.json(await issueTokens(user));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body as { refresh_token?: string };
    if (!refresh_token) return res.status(400).json({ detail: 'refresh_token is required' });

    const claims = verifyToken(refresh_token);
    if (claims.type !== 'refresh') return res.status(401).json({ detail: 'Not a refresh token' });

    const user = await userService.getById(claims.sub);
    if (!user) return res.status(401).json({ detail: 'User no longer exists' });

    // Reject if this refresh token was already rotated out or has expired server-side.
    if (
      user.refresh_token_hash !== hashToken(refresh_token) ||
      !user.refresh_token_expires_at ||
      new Date(user.refresh_token_expires_at) < new Date()
    ) {
      return res.status(401).json({ detail: 'Refresh token has been revoked or expired' });
    }

    return res.json(await issueTokens(user));
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired refresh token' });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await userService.getById(req.user!.sub);
  if (!user) return res.status(404).json({ detail: 'User not found' });
  return res.json(sanitize(user));
});

export default router;
