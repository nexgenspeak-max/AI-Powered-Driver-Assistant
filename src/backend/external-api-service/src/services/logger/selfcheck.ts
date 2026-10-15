/**
 * Contract check vs voice-agent tests/test_logger.py GOLDEN.
 * Run: npx ts-node --transpile-only src/services/logger/selfcheck.ts
 */
import { execSync } from 'child_process';
import { formatLine, maskPhones } from './format';
import { currentRoom, runWithLogContext } from './context';

const GOLDEN =
  '2026-08-29 11:00:00 INFO llm-orchestrator silence_tracker ' +
  'room=driver-088-abc conv=AJ_1 — 60s silence detected count=1 of=3';

export function assertLoggerContract(): void {
  const line = formatLine({
    ts: '2026-08-29 11:00:00',
    level: 'INFO',
    service: 'llm-orchestrator',
    fn: 'silence_tracker',
    room: 'driver-088-abc',
    conv: 'AJ_1',
    msg: '60s silence detected',
    fields: { count: 1, of: 3 },
  });
  if (line !== GOLDEN) {
    throw new Error(`logger contract drift:\n got: ${line}\nwant: ${GOLDEN}`);
  }
}

async function assertConcurrentRoomsDoNotMix(): Promise<void> {
  const worker = (room: string): Promise<string> =>
    runWithLogContext({ room, conv: room }, async () => {
      await new Promise((r) => setTimeout(r, 20));
      return currentRoom();
    });
  const [a, b] = await Promise.all([worker('room-a'), worker('room-b')]);
  if (a !== 'room-a' || b !== 'room-b') {
    throw new Error(`ALS mixed: a=${a} b=${b}`);
  }
}

export function assertPhonesMasked(): void {
  const cases: Array<[string, string]> = [
    ['call 0888123798 now', 'call 0888xxx798 now'],
    ['to=+84901234567', 'to=+84901xxx567'],
    ['phone=84901234567', 'phone=84901xxx567'],
    ['room=driver-0888123798-509f', 'room=driver-0888xxx798-509f'],
    ['ts=1760300000000 id=12345678901234', 'ts=1760300000000 id=12345678901234'],
  ];
  for (const [input, want] of cases) {
    const got = maskPhones(input);
    if (got !== want) throw new Error(`phone mask: ${input} -> ${got}, want ${want}`);
  }
  const line = formatLine({
    ts: '2026-10-13 10:00:00', level: 'INFO', service: 'external-api-service', fn: 'calls',
    room: 'driver-0888123798-abc', conv: '-', msg: 'dial', fields: { to: '+84901234567' },
  });
  if (/\d{10}/.test(line.replace(/\d{4}-\d{2}-\d{2}/, ''))) {
    throw new Error(`unmasked phone in log line: ${line}`);
  }
}

function assertNoRawConsoleInSrc(): void {
  const out = execSync(
    "grep -R --include='*.ts' -n -E 'console\\.(log|warn|error|info|debug)' src || true",
    { encoding: 'utf8' },
  );
  const leftover = out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.includes('/services/logger/'));
  if (leftover.length) {
    throw new Error(`raw console leftover:\n${leftover.join('\n')}`);
  }
}

if (require.main === module) {
  assertLoggerContract();
  assertPhonesMasked();
  assertNoRawConsoleInSrc();
  assertConcurrentRoomsDoNotMix()
    .then(() => process.stdout.write('logger contract ok\n'))
    .catch((err) => {
      process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
      process.exit(1);
    });
}
