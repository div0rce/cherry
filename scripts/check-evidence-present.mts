import * as fs from 'node:fs';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readEvidence, EVIDENCE_PATH } from './lib/evidence.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:evidence-present';
const FIX = 'Run the task with AGENT_MODE=1 and generate .evidence/latest.json before reporting completion.';

function guardrailFail(message: string): never {
  fail(PREFIX, message, { fix: FIX });
}

const evidenceRequired =
  process.env['AGENT_MODE'] === '1' || process.env['CHERRY_REQUIRE_EVIDENCE'] === '1';

function run(): void {
  if (!evidenceRequired) {
    process.stdout.write('check:evidence-present: ok (not required)\n');
    return;
  }

  if (!fs.existsSync(EVIDENCE_PATH)) {
    guardrailFail('Evidence file missing: .evidence/latest.json');
  }

  const evidence = readEvidence();

  const headResult = runTool('git', ['rev-parse', 'HEAD']);
  if (!headResult.ok) {
    guardrailFail('Failed to resolve git HEAD');
  }
  const head = headResult.stdout.trim();
  if (head.length === 0) {
    guardrailFail('Empty git HEAD');
  }
  if (evidence.head !== head) {
    guardrailFail(`Evidence head mismatch: expected ${head}, got ${evidence.head}`);
  }

  if (evidence.clean !== true) {
    guardrailFail('Evidence clean flag must be true');
  }

  const tmpRoot = process.env['CHERRY_TMP_ROOT'];
  if (tmpRoot === undefined || tmpRoot.length === 0) {
    guardrailFail('CHERRY_TMP_ROOT must be set when evidence checks are enforced');
  }
  if (evidence.storage.tmpRoot !== tmpRoot) {
    guardrailFail(`Evidence tmpRoot mismatch: expected ${tmpRoot}, got ${evidence.storage.tmpRoot}`);
  }

  if (evidence.checks.exitCode !== 0) {
    guardrailFail('Evidence checks.exitCode must be 0');
  }

  process.stdout.write('check:evidence-present: ok\n');
}

run();
