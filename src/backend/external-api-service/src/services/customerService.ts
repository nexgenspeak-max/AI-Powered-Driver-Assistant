import { authServiceClient } from './authServiceClient';

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Customer accounts are created exclusively through auth-service's /auth/register —
// trip-service only reads them here for the admin panel's customer list.

export async function listAll(): Promise<Customer[]> {
  const { data } = await authServiceClient.listByRole<Customer[]>('customer');
  const items = data ?? [];
  return items.sort((a, b) => a.name.localeCompare(b.name));
}
