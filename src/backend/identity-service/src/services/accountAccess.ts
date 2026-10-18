/**
 * Who may list, create and change which accounts.
 *
 * Before this, GET /accounts?role=… answered any signed-in user (a driver
 * could list every customer), and POST /auth/register created dispatcher
 * (admin) accounts for anyone. Dispatchers now come only from a super_admin,
 * and an admin can no longer edit or lock other admin / super_admin accounts.
 */
import type { Role } from './userService';

const STAFF: Role[] = ['admin', 'super_admin'];

export function canListAccounts(callerRole: Role | undefined): boolean {
  return !!callerRole && STAFF.includes(callerRole);
}

/** POST /accounts: admin creates customers; super_admin creates dispatchers. */
export function canCreateAccount(callerRole: Role | undefined, targetRole: Role | undefined): boolean {
  if (callerRole === 'admin') return targetRole === 'customer';
  if (callerRole === 'super_admin') return targetRole === 'admin';
  return false;
}

/** /auth/register: anyone may self-register as driver/customer; admin needs a super_admin. */
export function canRegister(role: Role, callerRole: Role | undefined): boolean {
  if (role === 'super_admin') return false;
  if (role === 'admin') return callerRole === 'super_admin';
  return true;
}

/** PATCH /accounts/:id beyond one's own account. */
export function canManage(callerRole: Role | undefined, targetRole: Role): boolean {
  if (callerRole === 'super_admin') return targetRole === 'admin';
  if (callerRole === 'admin') return targetRole === 'driver' || targetRole === 'customer';
  return false;
}
