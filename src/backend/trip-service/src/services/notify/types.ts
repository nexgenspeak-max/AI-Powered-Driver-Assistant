export type NotifyRole = 'driver' | 'customer';

export interface NotifyChannel {
  // No-op (not an error) if the target has no live connection — callers
  // don't need to know/care whether push actually landed. Apps refetch GET
  // context/trip on socket open and on these events, not on an interval.
  notify(role: NotifyRole, id: string, event: string, data: unknown): Promise<void>;
}
