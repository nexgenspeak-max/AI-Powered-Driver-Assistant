import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface OpsClaims {
  sub: string;
  role: string;
  permissions: string[];
  name: string;
  email?: string;
  type: 'access' | 'refresh';
}

declare global {
  namespace Express {
    interface Request {
      user?: OpsClaims;
    }
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ detail: 'Missing bearer token' });
    return;
  }

  try {
    const claims = jwt.verify(token, config.jwtSecret) as OpsClaims;
    if (claims.type !== 'access') {
      res.status(401).json({ detail: 'Not an access token' });
      return;
    }
    if (claims.role !== 'super_admin') {
      res.status(403).json({ detail: 'super_admin role required' });
      return;
    }
    req.user = claims;
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired token' });
  }
}
