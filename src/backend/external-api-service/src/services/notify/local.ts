import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { NotifyRole } from './types';
import { getLogger } from '../logger';

const log = getLogger('notify');

// Dev-only real-time channel — a plain `ws` server bolted onto the same
// HTTP server `local.ts` already runs (no separate port). Production swaps
// this for API Gateway WebSocket + postToConnection (see notify/lambda.ts);
// this file only ever runs when trip-service is started via `local.ts`.
//
// Client identifies itself via query string on the connection URL
// (`ws://host/ws?role=driver&id=<phone>`), not a first message — matching
// how API Gateway WebSocket's $connect route works (reads
// event.queryStringParameters before any message can be sent), so the
// FE client code is identical across both environments.
//
// A driver can have several live sockets at once (phone + simulator + web
// tab, or a reconnect that opens before the old socket's close lands), so
// each key holds a set and notify() fans out to all of them — the same
// semantics as notify/lambda.ts, which queries every connectionId for the
// user. A single-socket map let the newest connection silently steal every
// trip_offer from the device the driver was actually looking at.
const connections = new Map<string, Set<WebSocket>>();

function connectionKey(role: string, id: string): string {
  return `${role}:${id}`;
}

export function attachWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const role = url.searchParams.get('role');
    const id = url.searchParams.get('id');
    if (!role || !id) {
      ws.close(1008, 'role and id query params are required');
      return;
    }

    const key = connectionKey(role, id);
    let sockets = connections.get(key);
    if (!sockets) {
      sockets = new Set();
      connections.set(key, sockets);
    }
    sockets.add(ws);

    ws.on('close', () => {
      const set = connections.get(key);
      if (!set) return;
      set.delete(ws);
      if (set.size === 0) connections.delete(key);
    });
  });

  log.info('local WebSocket server attached', { path: '/ws' });
}

export async function notify(role: NotifyRole, id: string, event: string, data: unknown): Promise<void> {
  const sockets = connections.get(connectionKey(role, id));
  if (!sockets || sockets.size === 0) return;
  const payload = JSON.stringify({ event, data });
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}
