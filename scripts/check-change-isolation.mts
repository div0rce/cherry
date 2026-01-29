import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { runTool } from './guardrails/lib/run-tool.mjs';

ensureTsEsm();

const PREFIX = 'check:change-isolation';
const FIX =
  'Stage files that match the commit prefix, or set CHERRY_COMMIT_MESSAGE to the intended message.';

function guardrailFail(message: string, details?: string[]): never {
  fail(PREFIX, message, { details, fix: FIX });
}

function normalizePath(value: string): string {
  return value.split('\\').join('/');
}

function getStagedFiles(): string[] {
  const result = runTool('git', ['diff', '--name-only', '--cached']);
  if (result.exitCode !== 0) {
    guardrailFail('Unable to read staged files', [result.stderr.trim(), result.stdout.trim()].filter(Boolean));
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(normalizePath);
}

function resolveCommitMessage(): string {
  const envMessage = process.env['CHERRY_COMMIT_MESSAGE'];
  if (envMessage !== undefined && envMessage.length > 0) return envMessage;
  const altMessage = process.env['GIT_COMMIT_MESSAGE'];
  if (altMessage !== undefined && altMessage.length > 0) return altMessage;
  return '';
}

function parsePrefix(message: string): string | null {
  const firstLine = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (firstLine === undefined || firstLine.length === 0) return null;
  const match = firstLine.match(/^([a-z-]+(?:\([^)]+\))?):/);
  return match?.at(1) ?? null;
}

function isAllowed(category: string, filePath: string): boolean {
  if (category === 'engine') {
    return filePath.startsWith('lib/engine/');
  }
  if (category === 'guardrails') {
    return filePath.startsWith('scripts/') || filePath === 'package.json';
  }
  if (category === 'docs') {
    return filePath.startsWith('docs/');
  }
  if (category === 'tests') {
    return filePath.startsWith('tests/');
  }
  if (category === 'chore(engine-freeze)') {
    return filePath === 'scripts/guardrails/engine-freeze.policy.json';
  }
  return false;
}

function resolveCategory(prefix: string): string | null {
  const allowed = new Set(['engine', 'guardrails', 'docs', 'tests', 'chore(engine-freeze)']);
  return allowed.has(prefix) ? prefix : null;
}

function main(): void {
  const staged = getStagedFiles();
  if (staged.length === 0) {
    process.stdout.write('check-change-isolation: ok (no staged files)\n');
    return;
  }

  const message = resolveCommitMessage();
  if (message.length === 0) {
    guardrailFail('Missing commit message for staged changes', ['Set CHERRY_COMMIT_MESSAGE to the intended commit message.']);
  }

  const prefix = parsePrefix(message);
  if (prefix === null) {
    guardrailFail('Unable to parse commit prefix', [message.split(/\r?\n/)[0] ?? '']);
  }

  const category = resolveCategory(prefix);
  if (category === null) {
    guardrailFail(`Unsupported commit prefix: ${prefix}`);
  }

  const violations = staged.filter((filePath) => !isAllowed(category, filePath));
  if (violations.length > 0) {
    const details = violations.map((filePath) => `${filePath}:1:1: change-isolation-violation`);
    guardrailFail(`Commit prefix ${category} does not match staged files`, details);
  }

  process.stdout.write('check-change-isolation: ok\n');
}

main();
