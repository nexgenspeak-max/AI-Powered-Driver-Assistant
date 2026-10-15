/**
 * Customer CRUD contract (AVDA-118) against an in-memory identity-service stub.
 * Run: npm run verify:customers
 */
import { config } from '../config';
import * as customerService from './customerService';
import { normalizeVnMobile } from '../utils/phone';

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

async function expectError(fn: () => Promise<unknown>, status: number, code: string, msg: string): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const e = err as customerService.CustomerError;
    check(e instanceof customerService.CustomerError && e.status === status && e.code === code, msg);
    return;
  }
  throw new Error(`FAIL: ${msg} (no error)`);
}

type Account = { id: string; role: string; name: string; phone: string; status: string; created_at: string; updated_at: string };
const accounts: Account[] = [
  { id: 'c1', role: 'customer', name: 'An', phone: '+84901111111', status: 'offline', created_at: '', updated_at: '' },
];
let nextId = 2;

function json(status: number, body: unknown) {
  return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).fetch = async (url: string, init: { method?: string; body?: string } = {}) => {
  const path = url.replace(config.authServiceUrl, '');
  const method = init.method ?? 'GET';
  if (method === 'GET' && path.startsWith('/api/v1/accounts?role=customer')) return json(200, accounts);
  if (method === 'POST' && path === '/api/v1/accounts') {
    const b = JSON.parse(init.body ?? '{}');
    if (accounts.some(a => a.phone === b.phone)) return json(409, { detail: 'dup' });
    const acc = { id: `c${nextId++}`, role: 'customer', status: 'offline', created_at: '', updated_at: '', ...b };
    accounts.push(acc);
    return json(201, acc);
  }
  const m = path.match(/^\/api\/v1\/accounts\/([^/?]+)$/);
  const acc = m ? accounts.find(a => a.id === m[1]) : undefined;
  if (m && !acc) return json(404, { detail: 'not found' });
  if (method === 'PATCH' && acc) {
    Object.assign(acc, JSON.parse(init.body ?? '{}'));
    return json(200, acc);
  }
  if (method === 'DELETE' && acc) {
    accounts.splice(accounts.indexOf(acc), 1);
    return { ok: true, status: 204, json: async () => null, text: async () => '' };
  }
  return json(500, { detail: `unexpected ${method} ${path}` });
};

async function main(): Promise<void> {
  check(normalizeVnMobile('+84 901-111-111') === '0901111111', 'phone +84 with spaces/dashes normalizes to 0xxxxxxxxx');
  check(normalizeVnMobile('84987654321') === '0987654321', 'phone 84… normalizes');
  check(normalizeVnMobile('0123456789') === null, 'non-mobile prefix 01 is rejected');
  check(normalizeVnMobile('09012') === null, 'too short is rejected');

  const created = await customerService.create({ name: 'Bình', phone: '+84 912 345 678' });
  check(created.phone === '0912345678', 'create stores the normalized phone');
  await expectError(() => customerService.create({ name: 'X', phone: '12345' }), 400, 'INVALID_PHONE', 'create with invalid phone -> 400');
  await expectError(() => customerService.create({ name: '', phone: '0933333333' }), 400, 'NAME_REQUIRED', 'create without name -> 400');
  await expectError(() => customerService.create({ name: 'An 2', phone: '0901111111' }), 409, 'DUPLICATE_PHONE',
    'create with same phone written differently (0… vs +84…) -> 409');

  const renamed = await customerService.update(created.id, { name: 'Bình Nguyễn' });
  check(renamed.name === 'Bình Nguyễn', 'update renames customer');
  await expectError(() => customerService.update(created.id, { phone: '84901111111' }), 409, 'DUPLICATE_PHONE',
    'update to another customer\'s phone -> 409');
  await expectError(() => customerService.update('missing', { name: 'Z' }), 404, 'NOT_FOUND', 'update unknown id -> 404');

  const invalidated: string[] = [];
  const result = await customerService.remove('c1', {
    tripsForPhone: async () => [
      { trip_id: 't1', status: 'confirmed', driver_phone: '0900000001', customer_phone: '+84901111111' },
      { trip_id: 't2', status: 'completed', driver_phone: '0900000002', customer_phone: '+84901111111' },
    ],
    invalidate: async (t) => { invalidated.push(String(t.driver_phone)); },
  });
  check(!accounts.some(a => a.id === 'c1'), 'delete removes the account');
  check(invalidated.length === 2, 'delete refreshes cached context of every party on the customer\'s trips');
  check(result.open_trip_ids.join() === 't1', 'delete reports open trips so the dispatcher can reassign them');
  await expectError(() => customerService.remove('c1', { tripsForPhone: async () => [], invalidate: async () => undefined }),
    404, 'NOT_FOUND', 'delete unknown id -> 404');
  process.stdout.write('customers selfcheck passed\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
