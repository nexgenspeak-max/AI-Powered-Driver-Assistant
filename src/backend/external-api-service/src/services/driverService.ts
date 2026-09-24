import { authServiceClient } from './authServiceClient';

export interface Driver {
  id: string;
  phone: string;
  name: string;
  status: string;
  fcm_token?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  vehicle_name?: string;
  created_at: string;
  updated_at: string;
}

// Driver accounts are created exclusively through auth-service's /auth/register —
// trip-service only reads/updates the operational fields on an existing account.

export async function get(phone: string): Promise<Driver | null> {
  const { data } = await authServiceClient.getByPhone<Driver & { role: string }>(phone);
  return data && data.role === 'driver' ? data : null;
}

export async function update(phone: string, fields: Record<string, unknown>): Promise<Driver | null> {
  const existing = await get(phone);
  if (!existing) return null;
  const { data } = await authServiceClient.update<Driver>(existing.id, fields);
  return data;
}

export async function listAll(): Promise<Driver[]> {
  const { data } = await authServiceClient.listByRole<Driver[]>('driver');
  const items = data ?? [];
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function listOnline(drivers: Driver[]): Driver[] {
  return drivers.filter(d => d.status === 'online');
}
