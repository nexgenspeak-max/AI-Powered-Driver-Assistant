import jwt from 'jsonwebtoken';
import { config } from '../config';

let cachedToken: string | null = null;
let cachedExpiryEpochSeconds = 0;

/**
 * Short-lived service JWT signed with the shared JWT_SECRET so this service
 * can call identity-service / call-records / external-channel server-to-server.
 * Login tokens are still issued only by identity-service.
 */
export function serviceToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExpiryEpochSeconds - 30 > now) {
    return cachedToken;
  }

  cachedToken = jwt.sign(
    {
      sub: 'external-api-service',
      role: 'admin',
      permissions: ['*'],
      name: 'external-api-service',
      type: 'access',
    },
    config.jwtSecret,
    { expiresIn: '5m' },
  );
  cachedExpiryEpochSeconds = now + 5 * 60;
  return cachedToken;
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${serviceToken()}`,
    ...extra,
  };
}
