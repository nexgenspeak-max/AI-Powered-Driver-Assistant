/**
 * Contract check vs voice-agent tests/test_logger.py GOLDEN.
 * Run: npx ts-node --transpile-only src/services/logger/selfcheck.ts
 */
import { execSync } from 'child_process';
import { formatLine } from './format';
import { currentRoom, runWithLogContext } from './context';

const GOLDEN =
  '2026-08-29 11:00:00 INFO voice-agent silence_tracker ' +
  'room=driver-088-abc conv=AJ_1 — 60s silence detected count=1 of=3';

export function assertLoggerContract(): void {
  const line = formatLine({
    ts: '2026-08-29 11:00:00',
    level: 'INFO',
    service: 'voice-agent',
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
  assertNoRawConsoleInSrc();
  assertConcurrentRoomsDoNotMix()
    .then(() => process.stdout.write('logger contract ok\n'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
