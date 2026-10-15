/**
 * Test runner: creates one temp SOC_DATA_DIR, runs all suites with tsx --test,
 * then cleans up. Keeps the real .data/ untouched.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'soc-test-data-'));
const isWin = process.platform === 'win32';
const arg = process.argv[2] ?? 'all';
const groups = {
  storage: ['tests/storage.test.mjs', 'tests/worker-contract.test.mjs'],
  handlers: ['tests/handlers.test.mjs'],
};
const chunks =
  arg === 'storage'
    ? [groups.storage]
    : arg === 'handlers'
      ? [groups.handlers]
      : [groups.storage, groups.handlers];
let code = 0;
for (const chunk of chunks) {
  const r = spawnSync('npx', ['tsx', '--test', ...chunk], {
    stdio: 'inherit',
    shell: isWin,
    env: { ...process.env, SOC_DATA_DIR: dir },
  });
  if ((r.status ?? 1) !== 0) code = r.status ?? 1;
}
try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  console.warn(`[test] could not remove temp dir ${dir}`);
}
process.exit(code);
