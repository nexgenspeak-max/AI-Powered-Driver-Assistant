// Seed a Super Admin account. There is no public register for this role.
//
// Usage (from src/backend/identity-service):
//   SUPER_ADMIN_EMAIL=ops@example.com SUPER_ADMIN_PASSWORD='...' SUPER_ADMIN_NAME='Ops' \
//     npm run create-super-admin
import '../src/config';
import bcrypt from 'bcryptjs';
import * as userService from '../src/services/userService';
import { getLogger } from '../src/services/logger';

const log = getLogger('createSuperAdmin');

async function main(): Promise<void> {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || '';
  const name = (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim();

  if (!email || !password) {
    log.error('missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD');
    process.exit(1);
  }
  if (password.length < 10) {
    log.error('SUPER_ADMIN_PASSWORD must be at least 10 characters');
    process.exit(1);
  }

  const existing = await userService.getByEmail(email, 'super_admin');
  if (existing) {
    log.info('already exists', { id: existing.id });
    return;
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await userService.create({
    role: 'super_admin',
    name,
    email,
    password_hash,
    permissions: ['ops:*'],
  });
  log.info('created', { id: user.id });
}

main().catch((err) => {
  log.error('failed', { detail: String(err) });
  process.exit(1);
});
