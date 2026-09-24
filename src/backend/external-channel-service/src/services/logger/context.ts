import { AsyncLocalStorage } from 'async_hooks';

export type LogStore = { room?: string; conv?: string };

export const logContext = new AsyncLocalStorage<LogStore>();

export function bind(ctx: LogStore): void {
  const prev = logContext.getStore() ?? {};
  logContext.enterWith({ ...prev, ...ctx });
}

export function runWithLogContext<T>(ctx: LogStore, fn: () => T): T {
  return logContext.run(ctx, fn);
}

export function currentRoom(): string {
  return logContext.getStore()?.room || '-';
}

export function currentConv(): string {
  return logContext.getStore()?.conv || '-';
}
