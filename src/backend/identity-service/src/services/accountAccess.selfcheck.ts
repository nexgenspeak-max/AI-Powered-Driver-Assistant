// Run: npm run verify:access
import assert from 'node:assert/strict';
import { canCreateAccount, canListAccounts, canManage, canRegister } from './accountAccess';

assert.equal(canListAccounts('driver'), false, 'driver cannot list accounts');
assert.equal(canListAccounts('customer'), false, 'customer cannot list accounts');
assert.equal(canListAccounts(undefined), false);
assert.equal(canListAccounts('admin'), true);
assert.equal(canListAccounts('super_admin'), true);

assert.equal(canRegister('driver', undefined), true);
assert.equal(canRegister('customer', undefined), true);
assert.equal(canRegister('admin', undefined), false, 'no public dispatcher sign-up');
assert.equal(canRegister('admin', 'admin'), false);
assert.equal(canRegister('admin', 'super_admin'), true);
assert.equal(canRegister('super_admin', 'super_admin'), false);

assert.equal(canCreateAccount('admin', 'customer'), true);
assert.equal(canCreateAccount('admin', 'admin'), false);
assert.equal(canCreateAccount('super_admin', 'admin'), true);
assert.equal(canCreateAccount('super_admin', 'customer'), false);
assert.equal(canCreateAccount('driver', 'customer'), false);

assert.equal(canManage('admin', 'driver'), true);
assert.equal(canManage('admin', 'admin'), false, 'admin cannot lock another dispatcher');
assert.equal(canManage('admin', 'super_admin'), false);
assert.equal(canManage('super_admin', 'admin'), true);
assert.equal(canManage('super_admin', 'driver'), false);
process.stdout.write('account access selfcheck: OK\n');
