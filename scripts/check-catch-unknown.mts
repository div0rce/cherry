import { spawnSync } from 'node:child_process';
import { fail } from './guardrails/lib/fail.mts';

const PREFIX = 'check:catch-unknown';
const FIX = 'Use `catch (error: unknown)` and normalize before access.';

const rg = spawnSync('rg', ['catch\\s*\\(', 'app', 'lib'], { encoding: 'utf8' });
if (rg.status !== 0 && rg.status !== 1) {
  fail(PREFIX, `rg failed with status ${rg.status ?? 'null'}`, { fix: FIX });
}

const lines = (rg.stdout ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .filter((line) => line.includes('unknown') === false);

if (lines.length > 0) {
  fail(PREFIX, 'Raw catch without unknown detected', {
    details: lines,
    fix: FIX,
  });
}

process.stdout.write('catch-unknown: ok\n');
