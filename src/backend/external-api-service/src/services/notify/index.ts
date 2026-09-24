import { config } from '../../config';
import * as local from './local';
import * as lambda from './lambda';

export type { NotifyRole } from './types';

const impl = config.env === 'local' ? local : lambda;

export async function notifyDriver(phone: string, event: string, data: unknown): Promise<void> {
  await impl.notify('driver', phone, event, data);
}

export async function notifyCustomer(idOrPhone: string, event: string, data: unknown): Promise<void> {
  await impl.notify('customer', idOrPhone, event, data);
}

export function attachLocalWebSocketServer(httpServer: import('http').Server): void {
  if (config.env !== 'local') return;
  local.attachWebSocketServer(httpServer);
}
