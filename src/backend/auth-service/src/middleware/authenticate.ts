import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenClaims } from '../services/tokenService';

declare global {
  namespace Express {
    interface Request {
      user?: TokenClaims;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ detail: 'Missing bearer token' });

  try {
    const claims = verifyToken(token);
    if (claims.type !== 'access') return res.status(401).json({ detail: 'Not an access token' });
    req.user = claims;
    return next();
  } catch {
    return res.status(401).json({ detail: 'Invalid or expired token' });
  }
}
