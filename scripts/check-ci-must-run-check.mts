import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:ci-must-run-check';
const MISSING_CHECK_MESSAGE = 'CI must run `npm run ci:verify`';
const ROOT_ENV = process.env['CHERRY_CI_MUST_RUN_CHECK_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, 'ci.yml');

const FIX =
  'Run `npm run check:guardrails` before one final `npm run ci:verify`; do not run runtime tests directly in ci.yml.';

const REQUIRED_GUARDRAILS = ['check:guardrails'];
const DIRECT_RUNTIME_SCRIPTS = new Set([
  'check',
  'check:runtime',
  'check:node',
  'check:next',
  'check:tests',
  'check:tests:node',
  'check:tests:next',
  'check:run-tests',
  'check:run-tests:node',
  'check:run-tests:next',
  'test',
]);

type RunStep = {
  commands: string[];
};

function commandIsCiVerify(command: string): boolean {
  return /^npm\s+run\s+ci:verify\s*(#.*)?$/.test(command.trim());
}

function collectNpmRunCalls(commands: string[]): string[] {
  const calls: string[] = [];
  for (const command of commands) {
    const matches = command.matchAll(/npm\s+run\s+([^\s&]+)/g);
    for (const match of matches) {
      const name = match[1];
      if (typeof name === 'string' && name.length > 0) {
        calls.push(name);
      }
    }
  }
  return calls;
}

function indexOfCall(calls: string[], target: string): number {
  return calls.findIndex((name) => name === target);
}

function ensureOrdering(
  calls: string[],
  ordered: string[],
  label: string
): void {
  let lastIndex = -1;
  let lastName: string | null = null;
  for (const name of ordered) {
    const index = indexOfCall(calls, name);
    if (index === -1) {
      fail(PREFIX, `CI must run ${label}`, {
        details: [
          path.normalize(path.relative(ROOT, CI_WORKFLOW)) +
            `:1:1: missing npm run ${name}`,
        ],
        fix: FIX,
      });
    }
    if (index <= lastIndex) {
      fail(PREFIX, `CI must run ${label} in order`, {
        details: [
          path.normalize(path.relative(ROOT, CI_WORKFLOW)) +
            `:1:1: ${name} must run after ${lastName ?? 'the prior step'}`,
        ],
        fix: FIX,
      });
    }
    lastIndex = index;
    lastName = name;
  }
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

function fileHasCiVerify(filePath: string): { hasCiVerify: boolean; lastCommand: string | null } {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const steps = parseRunSteps(lines);
  if (steps.length === 0) return { hasCiVerify: false, lastCommand: null };
  const commands = collectCommands(steps);
  const hasCiVerify = commands.some((command) => commandIsCiVerify(command));
  const lastStep = steps[steps.length - 1];
  if (lastStep === undefined) {
    return { hasCiVerify, lastCommand: null };
  }
  for (let i = lastStep.commands.length - 1; i >= 0; i -= 1) {
    const command = lastStep.commands[i];
    if (command === undefined) continue;
    const trimmed = command.trim();
    if (trimmed.length === 0) continue;
    return { hasCiVerify, lastCommand: trimmed };
  }
  return { hasCiVerify, lastCommand: null };
}

function main(): void {
  if (fs.existsSync(CI_WORKFLOW) === false) {
    fail(PREFIX, MISSING_CHECK_MESSAGE, {
      details: [path.normalize(path.relative(ROOT, CI_WORKFLOW)) + ':1:1: ci.yml missing'],
      fix: FIX,
    });
  }
  const result = fileHasCiVerify(CI_WORKFLOW);
  if (!result.hasCiVerify) {
    fail(PREFIX, MISSING_CHECK_MESSAGE, {
      details: [path.normalize(path.relative(ROOT, CI_WORKFLOW)) + ':1:1: missing npm run ci:verify'],
      fix: FIX,
    });
  }
  if (result.lastCommand === null || !commandIsCiVerify(result.lastCommand)) {
    fail(PREFIX, MISSING_CHECK_MESSAGE, {
      details: [path.normalize(path.relative(ROOT, CI_WORKFLOW)) + ':1:1: npm run ci:verify must be last'],
      fix: FIX,
    });
  }

  const content = fs.readFileSync(CI_WORKFLOW, 'utf8');
  const steps = parseRunSteps(content.split(/\r?\n/));
  const commands = collectCommands(steps);
  const calls = collectNpmRunCalls(commands);
  const ciVerifyCalls = calls.filter((name) => name === 'ci:verify');
  if (ciVerifyCalls.length !== 1) {
    fail(PREFIX, 'CI must run exactly one ci:verify entrypoint', {
      details: [
        path.normalize(path.relative(ROOT, CI_WORKFLOW)) +
          `:1:1: found ${ciVerifyCalls.length} ci:verify calls`,
      ],
      fix: FIX,
    });
  }

  const directRuntime = calls.filter((name) => DIRECT_RUNTIME_SCRIPTS.has(name));
  if (directRuntime.length > 0) {
    fail(PREFIX, 'CI must not run runtime tests directly outside ci:verify', {
      details: [
        path.normalize(path.relative(ROOT, CI_WORKFLOW)) +
          `:1:1: direct runtime scripts: ${directRuntime.join(', ')}`,
      ],
      fix: FIX,
    });
  }

  ensureOrdering(calls, [...REQUIRED_GUARDRAILS, 'ci:verify'], 'guardrails before ci:verify');

  process.stdout.write('ci-must-run-check: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
