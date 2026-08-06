export type NotifyRole = 'driver' | 'customer';

export interface NotifyChannel {
  // No-op (not an error) if the target has no live connection — callers
  // don't need to know/care whether push actually landed; polling remains
  // the fallback everywhere this is used.
  notify(role: NotifyRole, id: string, event: string, data: unknown): Promise<void>;
}
