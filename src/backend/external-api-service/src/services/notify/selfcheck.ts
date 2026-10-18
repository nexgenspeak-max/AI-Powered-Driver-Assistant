/**
 * Local WebSocket notify contract + latency bar.
 * Run: npx ts-node --transpile-only src/services/notify/selfcheck.ts
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { WebSocket } from 'ws';
import { attachWebSocketServer, notify } from './local';

const OPEN_BUDGET_MS = 500;
const PUSH_BUDGET_MS = 50;

const NO_POLL_FILES = [
  'src/frontend/driver-app/src/features/dashboard/hooks/useDriverContext.ts',
  'src/frontend/driver-app/src/features/dashboard/components/TripOfferSheet.tsx',
  'src/frontend/customer-app/src/features/home/hooks/useCustomerContext.ts',
  'src/frontend/customer-app/src/features/trips/hooks/useTripStatus.ts',
];

function repoRoot(): string {
  return path.resolve(__dirname, '../../../../../../');
}

function assertNoLivePoll(): void {
  const root = repoRoot();
  for (const rel of NO_POLL_FILES) {
    const body = fs.readFileSync(path.join(root, rel), 'utf8');
    if (body.includes('refetchInterval')) {
      throw new Error(`live poll leftover: ${rel}`);
    }
  }
}

function onceMessage(ws: WebSocket, timeoutMs = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ws message timeout')), timeoutMs);
    ws.once('message', (data) => {
      clearTimeout(timer);
      resolve(String(data));
    });
  });
}

function waitOpen(ws: WebSocket, timeoutMs = 2000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error('ws open timeout')), timeoutMs);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function withServer<T>(fn: (port: number) => Promise<T>): Promise<T> {
  const server = http.createServer();
  attachWebSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (!addr || typeof addr === 'string') {
    server.close();
    throw new Error('no listen port');
  }
  try {
    return await fn(addr.port);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

export async function assertNotifyWs(): Promise<{ open_ms: number; push_ms: number }> {
  return withServer(async (port) => {
    const driverId = '+84900000001';
    const customerId = 'cust-ws-selfcheck';
    const t0 = Date.now();
    const driverWs = new WebSocket(`ws://127.0.0.1:${port}/ws?role=driver&id=${encodeURIComponent(driverId)}`);
    const customerWs = new WebSocket(`ws://127.0.0.1:${port}/ws?role=customer&id=${encodeURIComponent(customerId)}`);
    try {
      await Promise.all([waitOpen(driverWs), waitOpen(customerWs)]);
      const open_ms = Date.now() - t0;
      if (open_ms > OPEN_BUDGET_MS) {
        throw new Error(`ws open ${open_ms}ms exceeds ${OPEN_BUDGET_MS}ms`);
      }

      const driverGot = onceMessage(driverWs);
      const tPush = Date.now();
      await notify('driver', driverId, 'trip_offer', { trip_id: 'trip-selfcheck' });
      const driverRaw = await driverGot;
      const push_ms = Date.now() - tPush;
      if (push_ms > PUSH_BUDGET_MS) {
        throw new Error(`driver push ${push_ms}ms exceeds ${PUSH_BUDGET_MS}ms`);
      }
      const driverMsg = JSON.parse(driverRaw) as { event: string; data: { trip_id: string } };
      if (driverMsg.event !== 'trip_offer' || driverMsg.data.trip_id !== 'trip-selfcheck') {
        throw new Error(`unexpected driver payload ${driverRaw}`);
      }

      const customerGot = onceMessage(customerWs);
      await notify('customer', customerId, 'trip_updated', { trip_id: 'trip-selfcheck', status: 'calling' });
      const customerMsg = JSON.parse(await customerGot) as { event: string };
      if (customerMsg.event !== 'trip_updated') {
        throw new Error(`unexpected customer payload`);
      }

      await notify('driver', 'nobody', 'trip_offer', { trip_id: 'ignored' });

      // Same driver on two clients (phone + simulator/web, or a reconnect
      // racing the old socket's close): BOTH must get the offer. The old
      // one-socket-per-driver map let the newest connection steal it.
      const secondWs = new WebSocket(`ws://127.0.0.1:${port}/ws?role=driver&id=${encodeURIComponent(driverId)}`);
      try {
        await waitOpen(secondWs);
        const firstGot = onceMessage(driverWs);
        const secondGot = onceMessage(secondWs);
        await notify('driver', driverId, 'trip_offer', { trip_id: 'trip-fanout' });
        for (const raw of await Promise.all([firstGot, secondGot])) {
          if ((JSON.parse(raw) as { data: { trip_id: string } }).data.trip_id !== 'trip-fanout') {
            throw new Error(`fan-out payload mismatch ${raw}`);
          }
        }
        // Closing one client keeps the other subscribed.
        secondWs.close();
        await new Promise((r) => setTimeout(r, 50));
        const stillGot = onceMessage(driverWs);
        await notify('driver', driverId, 'trip_offer', { trip_id: 'after-close' });
        if (!(await stillGot).includes('after-close')) throw new Error('first socket lost after second closed');
      } finally {
        secondWs.close();
      }

      const bad = new WebSocket(`ws://127.0.0.1:${port}/ws`);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('missing-params socket did not close')), 2000);
        bad.once('close', (code) => {
          clearTimeout(timer);
          if (code !== 1008) {
            reject(new Error(`expected close 1008, got ${code}`));
            return;
          }
          resolve();
        });
        bad.once('error', () => {
          // Node ws may emit error before close when the peer rejects — still wait for close.
        });
      });
      bad.close();

      return { open_ms, push_ms };
    } finally {
      driverWs.close();
      customerWs.close();
    }
  });
}

if (require.main === module) {
  assertNoLivePoll();
  assertNotifyWs()
    .then((m) => {
      process.stdout.write(`notify ws ok open_ms=${m.open_ms} push_ms=${m.push_ms}\n`);
    })
    .catch((err) => {
      process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
      process.exit(1);
    });
}
