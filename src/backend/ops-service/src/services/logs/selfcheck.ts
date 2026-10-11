/* Log reader without AWS or network: part of npm run verify:ops */
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { isLogServiceId, lineMatches, resolveLogFiles, snapshotLines, tailMatching } from '.';
import { cleanMessage, filterPattern, logGroupName } from './cloudwatch';

const root = mkdtempSync(join(tmpdir(), 'ops-logs-'));
const dirs = { serviceDir: join(root, 'logs'), voiceDir: join(root, 'voice') };
mkdirSync(dirs.serviceDir);
mkdirSync(dirs.voiceDir);

const line = (ts: string, service: string, room: string, msg: string) =>
  `2026-10-11 ${ts} INFO ${service} fn room=${room} conv=- — ${msg}`;

async function main(): Promise<void> {
  // legacy SERVICE_NAME files resolve to the current service id
  writeFileSync(join(dirs.serviceDir, 'auth-service.log'), `${line('09:00:01', 'auth-service', '-', 'listening')}\n`);
  writeFileSync(join(dirs.serviceDir, 'trip-service.log'), `${line('09:00:03', 'trip-service', 'driver-088', 'GET trips')}\n`);
  writeFileSync(
    join(dirs.voiceDir, 'agent.111.log'),
    [
      line('09:00:02', 'llm-orchestrator', 'driver-088', 'Xin chào tài xế'),
      'Traceback (most recent call last):',
      line('09:00:04', 'llm-orchestrator', 'driver-0889', 'other session'),
      '',
    ].join('\n'),
  );
  writeFileSync(join(dirs.voiceDir, 'agent.111.log.1'), `${line('08:00:00', 'llm-orchestrator', '-', 'rotated')}\n`);

  assert.equal(isLogServiceId('llm-orchestrator'), true);
  assert.equal(isLogServiceId('auth-service'), false);
  assert.deepEqual(resolveLogFiles('identity-service', dirs), [join(dirs.serviceDir, 'auth-service.log')]);
  assert.deepEqual(resolveLogFiles('llm-orchestrator', dirs), [join(dirs.voiceDir, 'agent.111.log')]);
  assert.deepEqual(resolveLogFiles('call-records-service', dirs), []);
  assert.equal(resolveLogFiles(undefined, dirs).length, 3);

  assert.equal(lineMatches(line('09:00:00', 's', 'driver-088', 'x'), { room: 'driver-088' }), true);
  assert.equal(lineMatches(line('09:00:00', 's', 'driver-088', 'x'), { room: 'driver-099' }), false);
  assert.equal(lineMatches(line('09:00:00', 's', '-', 'Timeout calling'), { q: 'timeout' }), true);
  assert.equal(lineMatches('anything', { room: ' ', conv: '', q: '' }), true);

  // merged across services by timestamp; traceback stays under its line
  assert.deepEqual(
    snapshotLines(undefined, {}, 10, dirs).map((l) => l.slice(11, 19)),
    ['09:00:01', '09:00:02', 'most rec', '09:00:03', '09:00:04'],
  );
  assert.equal(snapshotLines(undefined, {}, 2, dirs).length, 2);
  assert.deepEqual(
    snapshotLines(undefined, { room: 'driver-088' }, 10, dirs).map((l) => l.slice(11, 19)),
    ['09:00:02', '09:00:03', '09:00:04'],           // prefix match, like grep
  );

  // tail: appended lines, a split write, and a new worker file
  const seen: string[] = [];
  const { stop } = tailMatching('llm-orchestrator', { q: 'new' }, (l) => seen.push(l), dirs, 20);
  appendFileSync(join(dirs.voiceDir, 'agent.111.log'), `${line('09:01:00', 'llm-orchestrator', '-', 'new one')}\n`);
  appendFileSync(join(dirs.voiceDir, 'agent.111.log'), '2026-10-11 09:01:01 INFO llm-orchestrator fn room=- conv=- — new ');
  await new Promise((r) => setTimeout(r, 60));
  appendFileSync(join(dirs.voiceDir, 'agent.111.log'), 'tài xế\nskipped line\n');
  writeFileSync(join(dirs.voiceDir, 'agent.222.log'), `${line('09:01:02', 'llm-orchestrator', '-', 'new worker')}\n`);
  await new Promise((r) => setTimeout(r, 80));
  stop();
  assert.deepEqual(seen.map((l) => l.split(' — ')[1]), ['new one', 'new tài xế', 'new worker']);

  assert.equal(logGroupName('llm-orchestrator'), '/ecs/local-driver-assistant-llm-orchestrator');
  assert.equal(logGroupName('identity-service'), '/aws/lambda/local-driver-assistant-identity-service-fn');
  assert.equal(filterPattern({}), undefined);
  assert.equal(filterPattern({ room: 'driver-088', q: 'say "hi"' }), '"room=driver-088" "say hi"');
  assert.equal(cleanMessage('2026-10-11T02:00:00.000Z\tabc-123\tINFO\t2026-10-11 09:00:00 INFO x\n'), '2026-10-11 09:00:00 INFO x');
  assert.equal(cleanMessage('START RequestId: abc Version: $LATEST\n'), '');

  console.log('logs selfcheck ok');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rmSync(root, { recursive: true, force: true }));
