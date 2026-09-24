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
const connections = new Map<string, WebSocket>();

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
    connections.set(key, ws);

    ws.on('close', () => {
      if (connections.get(key) === ws) connections.delete(key);
    });
  });

  log.info('local WebSocket server attached', { path: '/ws' });
}

export async function notify(role: NotifyRole, id: string, event: string, data: unknown): Promise<void> {
  const ws = connections.get(connectionKey(role, id));
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ event, data }));
}
