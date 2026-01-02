import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

const PREFIX = 'check:catch-unknown';
const FIX = 'Use `catch (error: unknown)` and normalize before access.';

const rg = runTool('rg', ['catch\\s*\\(', 'app', 'lib']);
if (rg.exitCode !== 0 && rg.exitCode !== 1) {
  const details: string[] = [];
  if (rg.stdout.trim().length > 0) {
    details.push(`stdout: ${rg.stdout.trim()}`);
  }
  if (rg.stderr.trim().length > 0) {
    details.push(`stderr: ${rg.stderr.trim()}`);
  }
  fail(PREFIX, `rg failed with status ${rg.exitCode}`, { details, fix: FIX });
}

const lines = rg.stdout
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
