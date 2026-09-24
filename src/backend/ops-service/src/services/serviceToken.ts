import jwt from 'jsonwebtoken';
import { config } from '../config';

let cachedToken: string | null = null;
let cachedExpiryEpochSeconds = 0;

/** Service JWT for outbound calls to call-records-service (shared JWT_SECRET). */
export function serviceToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExpiryEpochSeconds - 30 > now) {
    return cachedToken;
  }

  cachedToken = jwt.sign(
    {
      sub: 'ops-service',
      role: 'admin',
      permissions: ['*'],
      name: 'ops-service',
      type: 'access',
    },
    config.jwtSecret,
    { expiresIn: '5m' },
  );
  cachedExpiryEpochSeconds = now + 5 * 60;
  return cachedToken;
}

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${serviceToken()}` };
}
