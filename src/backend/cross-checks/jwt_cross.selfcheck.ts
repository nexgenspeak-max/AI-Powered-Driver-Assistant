/**
 * Cross-service JWT contract (AVDA-30 / AVDA-86): tokens issued by
 * identity-service are accepted by every service's middleware, and refresh,
 * foreign-secret or expired tokens are rejected everywhere. Service tokens of
 * external-api-service are accepted by identity-service.
 *
 * Run (from src/backend/external-api-service): npm run verify:jwt-cross
 */
process.env.JWT_SECRET = 'cross-check-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';

/* eslint-disable @typescript-eslint/no-var-requires */
const jwt = require('../external-api-service/node_modules/jsonwebtoken');
const identityTokens = require('../identity-service/src/services/tokenService');
const extApiService = require('../external-api-service/src/services/serviceToken');
const middlewares: Record<string, (req: any, res: any, next: () => void) => void> = {
  'identity-service': require('../identity-service/src/middleware/authenticate').authenticate,
  'external-api-service': require('../external-api-service/src/middleware/authenticate').authenticate,
  'external-channel-service': require('../external-channel-service/src/middleware/authenticate').authenticate,
  'call-records-service': require('../call-records-service/src/middleware/authenticate').authenticate,
  'ops-service': require('../ops-service/src/middleware/authenticate').requireSuperAdmin,
};

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

/** Runs one middleware; returns 'next' when it let the request through, else the HTTP status. */
function run(mw: (req: any, res: any, next: () => void) => void, token: string): number | 'next' {
  let out: number | 'next' = 0;
  const res = { status(code: number) { out = code; return { json() { return undefined; } }; } };
  mw({ headers: { authorization: `Bearer ${token}` } }, res, () => { out = 'next'; });
  return out;
}

const driver = { sub: 'u1', role: 'driver', permissions: [], name: 'D', phone: '0900000001' };
const superAdmin = { sub: 'u2', role: 'super_admin', permissions: ['*'], name: 'S', email: 's@x' };
const access = identityTokens.signAccessToken(driver);
const superAccess = identityTokens.signAccessToken(superAdmin);
const refresh = identityTokens.signRefreshToken(driver);
const foreign = jwt.sign({ ...driver, type: 'access' }, 'another-secret');
const expired = jwt.sign({ ...driver, type: 'access', exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);

for (const [name, mw] of Object.entries(middlewares)) {
  const isOps = name === 'ops-service';
  if (isOps) {
    check(run(mw, superAccess) === 'next', `${name}: accepts identity-issued super_admin access token`);
    check(run(mw, access) === 403, `${name}: driver access token -> 403 (super_admin only)`);
  } else {
    check(run(mw, access) === 'next', `${name}: accepts identity-issued access token`);
  }
  check(run(mw, refresh) === 401, `${name}: refresh token -> 401`);
  check(run(mw, foreign) === 401, `${name}: token signed with another secret -> 401`);
  check(run(mw, expired) === 401, `${name}: expired token -> 401`);
}
check(run(middlewares['identity-service'], extApiService.serviceToken()) === 'next',
  'identity-service accepts external-api-service service token (server-to-server calls)');
process.stdout.write('jwt cross-service selfcheck passed\n');
