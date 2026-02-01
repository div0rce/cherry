import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { readEvidence } from './lib/evidence.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:evidence-verifies';
const FIX = 'Regenerate .evidence/latest.json with the current commit and rerun checks in agent mode.';

function guardrailFail(message: string): never {
  fail(PREFIX, message, { fix: FIX });
}

const agentMode = process.env['AGENT_MODE'] === '1';
const ciMode = process.env['CI'] === 'true';

function run(): void {
  if (!agentMode && !ciMode) {
    process.stdout.write('check:evidence-verifies: ok (not required)\n');
    return;
  }

  const evidence = readEvidence();

  const statusResult = runTool('git', ['status', '--short']);
  if (!statusResult.ok) {
    guardrailFail('Failed to read git status');
  }
  if (statusResult.stdout.trim().length > 0) {
    guardrailFail('Working tree must be clean');
  }

  const showResult = runTool('git', ['show', evidence.head, '--name-only', '--pretty=format:']);
  if (!showResult.ok) {
    guardrailFail(`Failed to read git show for ${evidence.head}`);
  }
  const showFiles = showResult.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const expectedFiles = evidence.files
    .map((file) => file.trim())
    .filter((file) => file.length > 0);
  const showSerialized = JSON.stringify(showFiles);
  const expectedSerialized = JSON.stringify(expectedFiles);
  if (showSerialized !== expectedSerialized) {
    guardrailFail('Evidence files do not match git show output');
  }

  const verifyMode = process.env['EVIDENCE_VERIFY_MODE'] ?? (ciMode ? 'light' : 'full');
  if (verifyMode !== 'light' && verifyMode !== 'full') {
    guardrailFail(`Invalid EVIDENCE_VERIFY_MODE: ${verifyMode}`);
  }

  if (verifyMode === 'full') {
    const command = evidence.checks.command.trim();
    if (command === 'npm run check') {
      const result = runTool('npm', ['run', 'check']);
      if (!result.ok) {
        guardrailFail('Re-running "npm run check" failed');
      }
    } else if (command === 'npm run check:guardrails') {
      const result = runTool('npm', ['run', 'check:guardrails']);
      if (!result.ok) {
        guardrailFail('Re-running "npm run check:guardrails" failed');
      }
    } else {
      guardrailFail(`Unsupported evidence check command: ${command}`);
    }
  }

  process.stdout.write('check:evidence-verifies: ok\n');
}

run();
