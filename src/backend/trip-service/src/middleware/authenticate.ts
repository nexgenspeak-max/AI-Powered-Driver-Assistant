import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthClaims {
  sub: string;
  role: 'admin' | 'driver' | 'customer';
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

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ detail: 'Missing bearer token' });

  try {
    const claims = jwt.verify(token, config.jwtSecret) as AuthClaims;
    if (claims.type !== 'access') return res.status(401).json({ detail: 'Not an access token' });
    req.user = claims;
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}
