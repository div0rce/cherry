import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:no-workflow-force-delete';
const FIX =
  'If you intend to delete workflows, include [workflow-change] in the commit message.';
const WORKFLOW_PREFIX = '.github/workflows/';
const ALLOW_TAG = '[workflow-change]';

function guardrailFail(details: string[]): never {
  fail(PREFIX, 'Workflow deletion requires explicit tag', { details, fix: FIX });
}

const diff = runTool('git', ['diff', '--cached', '--name-status', '--', WORKFLOW_PREFIX]);
if (diff.exitCode !== 0) {
  guardrailFail([`git diff failed: ${diff.stderr.trim()}`]);
}

const deletions = diff.stdout
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('D\t'))
  .map((line) => line.slice(2))
  .filter((line) => line.length > 0);

if (deletions.length === 0) {
  process.stdout.write('check:no-workflow-force-delete: ok\n');
  process.exitCode = 0;
} else {
  const messageResult = runTool('git', ['log', '-1', '--pretty=%B']);
  const message = messageResult.stdout.trim();
  if (!message.includes(ALLOW_TAG)) {
    guardrailFail(deletions.map((file) => `deleted=${file}`));
  }
  process.stdout.write('check:no-workflow-force-delete: ok\n');
}
