/** Disk snapshot contract (AVDA-115). Run: npm run verify:disk */
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { diskSnapshot } from './disk';

function check(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  process.stdout.write(`ok   ${msg}\n`);
}

async function main(): Promise<void> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ops-disk-'));
  await fs.mkdir(path.join(root, 'sub'));
  await fs.writeFile(path.join(root, 'a.log'), Buffer.alloc(1000));
  await fs.writeFile(path.join(root, 'sub', 'b.log'), Buffer.alloc(234));
  const snap = await diskSnapshot([{ name: 'logs', path: root }, { name: 'missing', path: path.join(root, 'nope') }]);
  check(snap.total_bytes > 0 && snap.free_bytes > 0 && snap.free_bytes <= snap.total_bytes, 'volume total and free bytes reported');
  check(snap.used_pct >= 0 && snap.used_pct <= 100, 'used percent within 0–100');
  check(snap.dirs[0].bytes === 1234, 'directory size sums nested files (1000 + 234 bytes)');
  check(snap.dirs[1].bytes === null, 'missing directory reported as null, not an error');
  await fs.rm(root, { recursive: true, force: true });
  process.stdout.write('disk snapshot selfcheck passed\n');
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
