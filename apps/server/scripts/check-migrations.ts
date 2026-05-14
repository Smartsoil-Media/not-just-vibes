#!/usr/bin/env tsx
/**
 * Fails (exit 1) if the committed drizzle migrations are out of sync with
 * src/db/schema.ts.
 *
 * Two checks:
 *   1. `drizzle-kit check`   — journal/snapshot integrity (no collisions etc.)
 *   2. `drizzle-kit generate` — produces a new migration iff schema has drifted
 *      from the latest snapshot. We then ask git whether anything in `drizzle/`
 *      changed; if yes, the schema was edited without a corresponding
 *      migration.
 *
 * On failure we restore the drizzle/ directory to its committed state so a
 * developer's working copy isn't left with mystery files.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(here, '..');
const drizzleDir = 'drizzle';

function run(cmd: string, args: string[], opts: { allowFail?: boolean } = {}) {
  const res = spawnSync(cmd, args, { cwd: serverDir, stdio: 'inherit' });
  if (res.status !== 0 && !opts.allowFail) {
    process.exit(res.status ?? 1);
  }
  return res.status ?? 0;
}

function gitStatusPorcelain(path: string): string {
  return execFileSync('git', ['status', '--porcelain', '--', path], {
    cwd: serverDir,
    encoding: 'utf8',
  });
}

function restoreDrizzle() {
  // Restore tracked changes...
  spawnSync('git', ['checkout', '--', drizzleDir], {
    cwd: serverDir,
    stdio: 'ignore',
  });
  // ...and remove anything `generate` created that wasn't already tracked.
  spawnSync('git', ['clean', '-fdq', '--', drizzleDir], {
    cwd: serverDir,
    stdio: 'ignore',
  });
}

const baseline = gitStatusPorcelain(drizzleDir);
if (baseline.trim() !== '') {
  console.error(
    `db:check refuses to run: ${drizzleDir}/ has uncommitted changes. ` +
      'Commit or stash them first.',
  );
  console.error(baseline);
  process.exit(2);
}

console.log('• drizzle-kit check');
run('pnpm', ['drizzle-kit', 'check']);

console.log('• drizzle-kit generate (drift probe)');
run('pnpm', ['drizzle-kit', 'generate']);

const after = gitStatusPorcelain(drizzleDir);
if (after.trim() !== '') {
  console.error('\n❌ drizzle migrations are out of sync with schema.ts.');
  console.error('   `drizzle-kit generate` produced new output:');
  console.error(after);
  console.error(
    "\n   Fix: run 'pnpm --filter @njv/server drizzle-kit generate'" +
      ' and commit the result.',
  );
  restoreDrizzle();
  process.exit(1);
}

console.log('✓ migrations are in sync with schema.ts');
