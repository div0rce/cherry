import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:ci-must-run-check';
const MISSING_CHECK_MESSAGE = 'CI must run `npm run check`';
const ROOT_ENV = process.env['CHERRY_CI_MUST_RUN_CHECK_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, 'ci.yml');

const FIX = 'Add `npm run check` as the final CI command in ci.yml.';

type RunStep = {
  commands: string[];
};

function commandIsRunCheck(command: string): boolean {
  return /^npm\s+run\s+check\s*(#.*)?$/.test(command.trim());
}

function parseRunSteps(lines: string[]): RunStep[] {
  const steps: RunStep[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const match = line.match(/^(\s*)run:\s*(.*)$/);
    if (match === null) continue;
    const indent = match[1]?.length ?? 0;
    const tail = match[2]?.trim() ?? '';
    if (tail === '|' || tail === '>') {
      const commands: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j] ?? '';
        const nextIndent = next.match(/^\s*/)?.[0].length ?? 0;
        if (next.trim().length > 0 && nextIndent <= indent) {
          i = j - 1;
          break;
        }
        if (nextIndent > indent) {
          commands.push(next.trim());
        }
        if (j === lines.length - 1) {
          i = j;
        }
      }
      steps.push({ commands });
      continue;
    }
    steps.push({ commands: [tail] });
  }
  return steps;
}

function collectCommands(steps: RunStep[]): string[] {
  const commands: string[] = [];
  for (const step of steps) {
    for (const command of step.commands) {
      if (command.trim().length === 0) continue;
      commands.push(command);
    }
  }
  return commands;
}

function fileHasCheck(filePath: string): { hasCheck: boolean; lastCommand: string | null } {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const steps = parseRunSteps(lines);
  if (steps.length === 0) return { hasCheck: false, lastCommand: null };
  const commands = collectCommands(steps);
  const hasCheck = commands.some((command) => commandIsRunCheck(command));
  const lastStep = steps[steps.length - 1];
  if (lastStep === undefined) {
    return { hasCheck, lastCommand: null };
  }
  for (let i = lastStep.commands.length - 1; i >= 0; i -= 1) {
    const command = lastStep.commands[i];
    if (command === undefined) continue;
    const trimmed = command.trim();
    if (trimmed.length === 0) continue;
    return { hasCheck, lastCommand: trimmed };
  }
  return { hasCheck, lastCommand: null };
}

function main(): void {
  if (fs.existsSync(CI_WORKFLOW) === false) {
    fail(PREFIX, MISSING_CHECK_MESSAGE, {
      details: [path.normalize(path.relative(ROOT, CI_WORKFLOW)) + ':1:1: ci.yml missing'],
      fix: FIX,
    });
  }
  const result = fileHasCheck(CI_WORKFLOW);
  if (!result.hasCheck) {
    fail(PREFIX, MISSING_CHECK_MESSAGE, {
      details: [path.normalize(path.relative(ROOT, CI_WORKFLOW)) + ':1:1: missing npm run check'],
      fix: FIX,
    });
  }
  if (result.lastCommand === null || !commandIsRunCheck(result.lastCommand)) {
    fail(PREFIX, MISSING_CHECK_MESSAGE, {
      details: [path.normalize(path.relative(ROOT, CI_WORKFLOW)) + ':1:1: npm run check must be last'],
      fix: FIX,
    });
  }

  process.stdout.write('ci-must-run-check: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
