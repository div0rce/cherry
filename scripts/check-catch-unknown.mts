import { spawnSync } from 'node:child_process';

const PREFIX = 'catch-unknown';

function fail(message: string): never {
  process.stderr.write(`[${PREFIX}] ${message}\n`);
  process.exit(1);
}

const rg = spawnSync('rg', ['catch\\s*\\(', 'app', 'lib'], { encoding: 'utf8' });
if (rg.status !== 0 && rg.status !== 1) {
  fail(`rg failed with status ${rg.status ?? 'null'}`);
}

const lines = (rg.stdout ?? '')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .filter((line) => line.includes('unknown') === false);

if (lines.length > 0) {
  process.stderr.write('Raw catch without unknown:\n');
  for (const line of lines) {
    process.stderr.write(`${line}\n`);
  }
  process.exit(1);
}

process.stdout.write('catch-unknown: ok\n');
