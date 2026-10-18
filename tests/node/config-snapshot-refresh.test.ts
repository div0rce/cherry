import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// generate:config-snapshot rewrites only stale blocks, keeps every other byte, and is idempotent.

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

function refresh(root: string): string {
  const result = spawnSync('npm', ['run', '-s', 'generate:config-snapshot', '--', '--root', root], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  return result.stdout;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-snapshot-'));
fs.mkdirSync(path.join(root, 'docs'));
fs.writeFileSync(path.join(root, 'fresh.json'), '{ "a": 1 }\n');
fs.writeFileSync(path.join(root, 'stale.json'), '{\n  "b": 2\n}\n');

const prose = '# Config snapshot\n\nProse stays byte-identical.\n\n';
const freshBlock = '```json\n// fresh.json\n{ "a": 1 }\n```\n';
const otherBlock = '```text\nnot a config block\n```\n';
const snapshotPath = path.join(root, 'docs', 'config-snapshot.md');
fs.writeFileSync(
  snapshotPath,
  `${prose}${freshBlock}\n${otherBlock}\n\`\`\`json\n// stale.json\n{ "b": 1 }\n\`\`\`\n`
);

assert.equal(refresh(root).trim(), 'generate:config-snapshot: refreshed stale.json');
assert.equal(
  fs.readFileSync(snapshotPath, 'utf8'),
  `${prose}${freshBlock}\n${otherBlock}\n\`\`\`json\n// stale.json\n{\n  "b": 2\n}\n\`\`\`\n`
);

const afterFirst = fs.statSync(snapshotPath).mtimeMs;
assert.equal(refresh(root).trim(), 'generate:config-snapshot: up to date');
assert.equal(fs.statSync(snapshotPath).mtimeMs, afterFirst, 'an up-to-date snapshot is not rewritten');

fs.rmSync(root, { recursive: true, force: true });
process.stdout.write('config-snapshot-refresh: ok\n');
