import { authServiceClient, IdentityServiceError } from './authServiceClient';
import { normalizeVnMobile } from '../utils/phone';

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Customer accounts live in identity-service. Customers who register in the
// customer app go through /auth/register; customers who book by phone or Zalo
// are created by the dispatcher here (AVDA-118).

/** 400 invalid input, 404 unknown customer, 409 duplicate phone. */
export class CustomerError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409, readonly code: string) {
    super(message);
  }
}

export interface CustomerInput {
  name?: string;
  phone?: string;
  email?: string;
}

/** Side effects of deleting a customer on trips; injectable for selfcheck. */
export interface DeleteDeps {
  tripsForPhone: (phone: string) => Promise<Array<{ trip_id?: string; status?: string; driver_phone?: string; customer_phone?: string }>>;
  invalidate: (trip: { driver_phone?: string; customer_phone?: string }) => Promise<void>;
}

const OPEN_TRIP_STATUSES = new Set(['pending', 'confirmed', 'arrived_pickup', 'picked_up']);

export async function listAll(): Promise<Customer[]> {
  const { data } = await authServiceClient.listByRole<Customer[]>('customer');
  const items = data ?? [];
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

async function findById(id: string): Promise<Customer | null> {
  return (await listAll()).find(c => c.id === id) ?? null;
}

/** Existing customer whose phone is the same number in any written form (0…, 84…, +84…). */
async function findByNormalizedPhone(phone: string, exceptId?: string): Promise<Customer | null> {
  return (await listAll()).find(c => c.id !== exceptId && normalizeVnMobile(c.phone) === phone) ?? null;
}

function requirePhone(raw: unknown): string {
  const phone = normalizeVnMobile(String(raw ?? ''));
  if (!phone) throw new CustomerError('phone must be a Vietnamese mobile number (0xxxxxxxxx or +84xxxxxxxxx)', 400, 'INVALID_PHONE');
  return phone;
}

function duplicate(): CustomerError {
  return new CustomerError('A customer with this phone already exists', 409, 'DUPLICATE_PHONE');
}

export async function create(input: CustomerInput): Promise<Customer> {
  const name = (input.name ?? '').trim();
  if (!name) throw new CustomerError('name is required', 400, 'NAME_REQUIRED');
  const phone = requirePhone(input.phone);
  if (await findByNormalizedPhone(phone)) throw duplicate();
  try {
    const { data } = await authServiceClient.create<Customer>({ role: 'customer', name, phone, ...(input.email ? { email: input.email } : {}) });
    return data as Customer;
  } catch (err) {
    if (err instanceof IdentityServiceError && err.status === 409) throw duplicate();
    throw err;
  }
}

export async function update(id: string, input: CustomerInput): Promise<Customer> {
  const fields: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new CustomerError('name must not be empty', 400, 'NAME_REQUIRED');
    fields.name = name;
  }
  if (input.phone !== undefined) {
    const phone = requirePhone(input.phone);
    if (await findByNormalizedPhone(phone, id)) throw duplicate();
    fields.phone = phone;
  }
  if (input.email !== undefined) fields.email = input.email;
  try {
    const { status, data } = await authServiceClient.update<Customer>(id, fields);
    if (status === 404 || !data) throw new CustomerError('Customer not found', 404, 'NOT_FOUND');
    return data;
  } catch (err) {
    if (err instanceof IdentityServiceError && err.status === 409) throw duplicate();
    throw err;
  }
}

/**
 * Deletes the account and refreshes cached context of every party on the
 * customer's trips, so drivers and the dispatcher see the change at once.
 * Trips keep their snapshot of name and phone (history); open trips are
 * reported back so the dispatcher can reassign or cancel them.
 */
export async function remove(id: string, deps: DeleteDeps): Promise<{ open_trip_ids: string[] }> {
  const customer = await findById(id);
  if (!customer) throw new CustomerError('Customer not found', 404, 'NOT_FOUND');
  const { status } = await authServiceClient.remove(id);
  if (status === 404) throw new CustomerError('Customer not found', 404, 'NOT_FOUND');
  const trips = await deps.tripsForPhone(customer.phone);
  await Promise.all(trips.map(t => deps.invalidate(t)));
  return { open_trip_ids: trips.filter(t => t.trip_id && OPEN_TRIP_STATUSES.has(t.status ?? '')).map(t => t.trip_id as string) };
}
