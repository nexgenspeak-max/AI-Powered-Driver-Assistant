/* npm run verify:events — store logic without AWS */
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileEventStore } from './fileStore';
import { eventDateOf, sidOf } from './store';

(async () => {
  assert.equal(sidOf({ CallSid: 'CA1' }), 'CA1');
  assert.equal(sidOf({ MessageSid: 'SM1' }), 'SM1');
  assert.equal(sidOf({}), '-');
  assert.equal(eventDateOf('2026-09-27T17:30:00Z'), '2026-09-28');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'events-'));
  const store = new FileEventStore(dir);
  await store.put({ ts: '2026-09-27T01:00:00Z', source: 'outbound_status', sid: 'CA1', CallStatus: 'ringing' });
  await store.put({ ts: '2026-09-27T01:00:05Z', source: 'sms_sent', sid: 'SM9', MessageSid: 'SM9' });
  await store.put({ ts: '2026-09-27T01:00:09Z', source: 'outbound_status', sid: 'CA1', CallStatus: 'completed' });
  const one = await store.list(10, 'CA1');
  assert.deepEqual(one.map((e) => e.CallStatus), ['completed', 'ringing']); // newest first
  assert.equal((await store.list(2)).length, 2);
  fs.rmSync(dir, { recursive: true });
  console.log('verify:events ok');
})().catch((e) => { console.error(e); process.exit(1); });
