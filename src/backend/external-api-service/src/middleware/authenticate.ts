import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthClaims {
  sub: string;
  role: 'admin' | 'driver' | 'customer' | 'super_admin';
  permissions: string[];
  name: string;
  phone?: string;
  email?: string;
  type: 'access' | 'refresh';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthClaims;
    }
  }
}

/** Verify identity-service access JWT (shared JWT_SECRET). No fake users. */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ detail: 'Missing bearer token' });
    return;
  }

  try {
    const claims = jwt.verify(token, config.jwtSecret) as AuthClaims;
    if (claims.type !== 'access') {
      res.status(401).json({ detail: 'Not an access token' });
      return;
    }
    req.user = claims;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}
