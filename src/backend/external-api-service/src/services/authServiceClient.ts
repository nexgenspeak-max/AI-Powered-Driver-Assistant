import { config } from '../config';
import { serviceToken } from './serviceToken';

/** Non-2xx answer from identity-service; keeps the status so callers can map 400/409. */
export class IdentityServiceError extends Error {
  constructor(message: string, readonly status: number, readonly body: string) {
    super(message);
  }
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
  if (res.status === 404) {
    return { status: 404, data: null };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new IdentityServiceError(`identity-service ${path} failed: ${res.status} ${body}`, res.status, body);
  }
  if (res.status === 204) {
    return { status: 204, data: null };
  }
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

/** HTTP client for identity-service accounts/settings (server-to-server JWT). */
export const authServiceClient = {
  getByPhone: <T>(phone: string, role?: string) =>
    request<T>(
      `/api/v1/accounts/phone/${encodeURIComponent(phone)}${role ? `?role=${encodeURIComponent(role)}` : ''}`,
    ),
  listByRole: <T>(role: string) => request<T>(`/api/v1/accounts?role=${encodeURIComponent(role)}`),
  update: <T>(id: string, fields: Record<string, unknown>) =>
    request<T>(`/api/v1/accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    }),
  getSettings: <T>(accountId: string) => request<T>(`/api/v1/settings/${encodeURIComponent(accountId)}`),
  create: <T>(fields: Record<string, unknown>) =>
    request<T>('/api/v1/accounts', { method: 'POST', body: JSON.stringify(fields) }),
  remove: (id: string) => request<null>(`/api/v1/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
