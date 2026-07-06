import jwt from 'jsonwebtoken';
import { config } from '../config';

let cachedToken: string | null = null;
let cachedExpiryEpochSeconds = 0;

// trip-service signs its own short-lived token with the shared JWT_SECRET so it can
// call auth-service's protected /accounts endpoints server-to-server.
function serviceToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExpiryEpochSeconds - 30 > now) return cachedToken;

  cachedToken = jwt.sign(
    { sub: 'trip-service', role: 'admin', permissions: ['*'], name: 'trip-service', type: 'access' },
    config.jwtSecret,
    { expiresIn: '5m' },
  );
  cachedExpiryEpochSeconds = now + 5 * 60;
  return cachedToken;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${config.authServiceUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken()}`,
      ...(init.headers || {}),
    },
  });
  if (res.status === 404) return { status: 404, data: null };
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`auth-service ${path} failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

export const authServiceClient = {
  getByPhone: <T>(phone: string) => request<T>(`/api/v1/accounts/phone/${encodeURIComponent(phone)}`),
  listByRole: <T>(role: string) => request<T>(`/api/v1/accounts?role=${encodeURIComponent(role)}`),
  update: <T>(id: string, fields: Record<string, unknown>) =>
    request<T>(`/api/v1/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    }),
};
