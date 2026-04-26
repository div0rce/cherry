import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'generate:cherry-diff';
const ROOT = process.cwd();
const PATCH_NAME = 'cherry-diff.patch';
const PATCH_PATH = path.join(ROOT, PATCH_NAME);

function assertOk(
  step: string,
  result: ReturnType<typeof runTool>
): void {
  if (result.exitCode === 0) return;
  const details = [`step=${step}`, `exit=${result.exitCode}`];
  if (result.stdout.trim().length > 0) {
    details.push(`stdout=${result.stdout.trim()}`);
  }
  if (result.stderr.trim().length > 0) {
    details.push(`stderr=${result.stderr.trim()}`);
  }
  fail(PREFIX, `Failed during ${step}.`, {
    details,
    fix: 'Resolve the git error, then rerun the patch generator.',
  });
}

function removeIfExists(targetPath: string): void {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { force: true, recursive: true });
  }
}

function main(): void {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-diff-'));
  const tempIndex = path.join(tempRoot, 'index');
  const tempPatch = path.join(tempRoot, PATCH_NAME);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_INDEX_FILE: tempIndex,
  };

  try {
    const status = runTool('git', ['status', '--short'], { cwd: ROOT });
    assertOk('git status --short', status);
    if (status.stdout.length > 0) {
      process.stdout.write(status.stdout);
    }

    const readTree = runTool('git', ['read-tree', 'HEAD'], { cwd: ROOT, env });
    assertOk('git read-tree HEAD', readTree);

    const add = runTool('git', ['add', '-A'], { cwd: ROOT, env });
    assertOk('git add -A', add);

    const diff = runTool(
      'git',
      [
        'diff',
        '--cached',
        '--binary',
        '--full-index',
        '--find-renames',
        'HEAD',
        '--',
        '.',
        ':(exclude)cherry-diff.patch',
      ],
      { cwd: ROOT, env }
    );
    assertOk('git diff --cached', diff);

    fs.writeFileSync(tempPatch, diff.stdout, 'utf8');
    fs.renameSync(tempPatch, PATCH_PATH);

    process.stdout.write(`${PATCH_NAME}: ok\n`);
  } finally {
    removeIfExists(tempRoot);
  }
}

main();
