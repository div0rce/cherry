import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();

const PREFIX = 'check:guardrail-doc-sync';
const FIX = 'Update docs/guardrails.md whenever the registry changes.';
const REGISTRY_FILE = path.join('scripts', 'guardrails', 'registry.mts');
const DOC_FILE = path.join('docs', 'guardrails.md');
const OVERRIDE_BASE = process.env['CHERRY_GUARDRAIL_DOC_SYNC_BASE'];

function guardrailFail(message: string): never {
  fail(PREFIX, message, { fix: FIX });
}

function runDiff(args: string[]): string[] | null {
  const result = spawnSync('git', ['diff', '--name-only', ...args], { encoding: 'utf8' });
  if (result.status !== 0) {
    return null;
  }
  return (result.stdout ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function resolveDiff(): string[] {
  if (OVERRIDE_BASE !== undefined && OVERRIDE_BASE !== '') {
    const diff = runDiff([OVERRIDE_BASE]);
    if (diff === null) {
      guardrailFail(`Unable to compute git diff for base ${OVERRIDE_BASE}`);
    }
    return diff;
  }

  const originDiff = runDiff(['origin/main...HEAD']);
  if (originDiff !== null) {
    return originDiff;
  }

  const headDiff = runDiff(['HEAD~1']);
  if (headDiff !== null) {
    return headDiff;
  }

  guardrailFail('Unable to compute git diff for guardrail doc sync');
}

function main(): void {
  const changed = resolveDiff();
  const registryChanged = changed.includes(REGISTRY_FILE);
  if (registryChanged === false) {
    process.stdout.write('guardrail-doc-sync: ok\n');
    return;
  }
  const docChanged = changed.includes(DOC_FILE);
  if (docChanged === false) {
    guardrailFail(`Registry changed without ${DOC_FILE}`);
  }
  process.stdout.write('guardrail-doc-sync: ok\n');
}

main();
