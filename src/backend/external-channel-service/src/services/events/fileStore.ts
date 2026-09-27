import * as fs from 'fs';
import * as path from 'path';
import { EventStore, ProviderEvent } from './store';

/** Local-dev adapter: append-only JSONL under data/. Not used when EVENTS_TABLE is set. */
export class FileEventStore implements EventStore {
  private readonly file: string;

  constructor(dir: string) {
    this.file = path.join(dir, 'twilio_events.jsonl');
  }

  async put(event: ProviderEvent): Promise<void> {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.appendFileSync(this.file, `${JSON.stringify(event)}\n`, 'utf-8');
  }

  async list(limit: number, sid?: string): Promise<ProviderEvent[]> {
    if (!fs.existsSync(this.file)) return [];
    const rows = fs.readFileSync(this.file, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line) as ProviderEvent; } catch { return null; } })
      .filter((r): r is ProviderEvent => r !== null)
      .filter((r) => !sid || r.sid === sid || r.CallSid === sid || r.MessageSid === sid);
    return rows.slice(-limit).reverse();
  }
}
