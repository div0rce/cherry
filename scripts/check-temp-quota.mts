import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { resolveTmpRoot } from './lib/tmp-root.mjs';
import { currentTimeMs, purgeStaleTempDirs, totalSizeBytes } from './lib/temp-quota.mjs';

ensureTsEsm();

const PREFIX = 'check:temp-quota';
const FIX = 'Purge temp artifacts under CHERRY_TMP_ROOT or increase disk space.';
const MAX_BYTES = 5 * 1024 * 1024 * 1024;
const STALE_MS = 24 * 60 * 60 * 1000;

function main(): void {
  const root = resolveTmpRoot();
  const nowMs = currentTimeMs();
  purgeStaleTempDirs(root, nowMs, STALE_MS);
  const totalBytes = totalSizeBytes(root);

  if (totalBytes > MAX_BYTES) {
    const totalGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    fail(PREFIX, 'Temporary storage exceeds quota', {
      details: [`root=${root}`, `totalGb=${totalGb}`, `limitGb=5`],
      fix: FIX,
    });
  }

  process.stdout.write('check:temp-quota: ok\n');
}

main();
