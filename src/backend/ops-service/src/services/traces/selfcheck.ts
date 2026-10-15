/* Trace reader without the voice agent: part of npm run verify:ops */
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { isValidRoom, listSessions, readSession, tailSession, traceFile, type TraceEvent } from '.';

const dir = mkdtempSync(join(tmpdir(), 'ops-traces-'));
const ROOM = 'driver-088_abc.1';

const ev = (seq: number, turn: number, kind: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ v: 1, ts: 1_791_000_000 + seq, room: ROOM, seq, turn, kind, ...extra });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  assert.equal(isValidRoom('driver-088'), true);
  for (const bad of ['', '..', '../etc/passwd', 'a/b', 'a b', 'x%2F', '.']) {
    assert.equal(isValidRoom(bad), false, bad);
  }
  assert.throws(() => traceFile('../x', dir));

  const file = join(dir, `${ROOM}.jsonl`);
  writeFileSync(
    file,
    [
      ev(1, 0, 'session_start', { mode: 'driver', lang: 'vi', agent: 'driver', participant: 'driver-088' }),
      ev(2, 1, 'user', { text: 'Chuyến tiếp theo?', language: 'vi' }),
      ev(3, 1, 'llm_request', { call: 1, model: 'm', messages: [], tools: [] }),
      'not json',
      ev(4, 1, 'llm_response', { call: 1, text: 'Dạ', tool_calls: [], ttft_ms: 900 }),
      '{"v":1,"seq":5,"tu', // partial line still being written
    ].join('\n'),
  );
  writeFileSync(join(dir, 'other.jsonl'), `${ev(1, 0, 'session_start', { mode: 'customer', lang: 'en' })}\n${ev(2, 0, 'session_end')}\n`);
  writeFileSync(join(dir, 'ignored.txt'), 'x');
  utimesSync(join(dir, 'other.jsonl'), new Date(1_000_000), new Date(1_000_000));

  // list: newest first, partial line ignored, foreign files skipped
  const list = listSessions({ dir });
  assert.deepEqual(list.map((s) => s.room), [ROOM, 'other']);
  assert.equal(list[0].mode, 'driver');
  assert.equal(list[0].lang, 'vi');
  assert.equal(list[0].startedAt, (1_791_000_000 + 1) * 1000);
  assert.equal(list[0].turns, 1);
  assert.equal(list[0].llmCalls, 1);
  assert.equal(list[0].ended, false);
  assert.equal(list[0].participant, 'driver-088');
  assert.equal(list[0].stats.avgTtftMs, 900);
  assert.equal(list[1].ended, true);
  assert.equal(listSessions({ limit: 1, dir }).length, 1);
  assert.deepEqual(listSessions({ mode: 'customer', dir }).map((s) => s.room), ['other']);

  // read: unparsable and partial lines skipped; afterSeq filters
  const snap = readSession(ROOM, { dir });
  assert.ok(snap);
  assert.deepEqual(snap.events.map((e) => e.seq), [1, 2, 3, 4]);
  assert.deepEqual(readSession(ROOM, { dir, afterSeq: 2 })?.events.map((e) => e.seq), [3, 4]);
  assert.equal(readSession('missing', { dir }), null);

  // tail: finish the partial line, then a split write, then session_end
  const seen: TraceEvent[] = [];
  const { stop } = tailSession(ROOM, (e) => seen.push(e), { dir, fromOffset: snap.offset, afterSeq: 4, pollMs: 20 });
  appendFileSync(file, 'rn":1,"ts":1,"room":"r","kind":"tool","name":"get_trip"}\n');
  appendFileSync(file, ev(6, 2, 'user', { text: 'ok' }).slice(0, 20));
  await sleep(60);
  appendFileSync(
    file,
    [
      ev(6, 2, 'user', { text: 'ok' }).slice(20),
      ev(7, 2, 'llm_metrics', { prompt_tokens: 7000, ttft_ms: 2500 }),
      ev(8, 2, 'turn_metrics', { total_ms: 2600, slow: true }),
      ev(9, 2, 'turn_metrics', { total_ms: 800, slow: false }),
      ev(10, 2, 'tool', { name: 'get_trip', is_error: true }),
      ev(11, 2, 'op', { name: 'turn_filler', ok: true, fields: {} }),
      ev(12, 2, 'op', { name: 'http', ok: false, fields: { status: 500 } }),
      ev(13, 2, 'speech', { role: 'assistant', text: 'x', interrupted: true }),
      ev(14, 2, 'session_end', { duration_ms: 10 }),
      '',
    ].join('\n'),
  );
  await sleep(80);
  stop();
  assert.deepEqual(seen.map((e) => e.seq), [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.equal(seen[0].kind, 'tool');

  // stats recomputed after the file changed (cache keyed by size+mtime)
  const after = listSessions({ dir }).find((s) => s.room === ROOM);
  assert.equal(after?.ended, true);
  assert.equal(after?.turns, 2);
  assert.equal(after?.llmCalls, 1);
  assert.deepEqual(after?.stats, {
    slowTurns: 1,
    avgTtftMs: 900,
    p95TotalMs: 2600,
    maxPromptTokens: 7000,
    toolErrors: 1,
    opErrors: 1,
    interruptions: 1,
    fillers: 1,
  });

  console.log('traces selfcheck ok');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
