import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from './guardrails/lib/read-json.mjs';
import { GUARDRAILS, GUARDRAIL_ENTRYPOINT } from './guardrails/registry.mjs';

ensureTsEsm();

type Violation = {
  file: string;
  line: number;
  col: number;
  message: string;
};

type PackageScripts = {
  scripts: Record<string, string>;
};

const PREFIX = 'check:ci-guardrail-coverage';
const ROOT = process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, 'ci.yml');
const CHECK_SCRIPT = 'check';
const CI_ENTRYPOINT = 'ci:verify';

function readPackageScripts(): PackageScripts {
  const packagePath = path.join(ROOT, 'package.json');
  if (fs.existsSync(packagePath) === false) {
    fail(PREFIX, 'package.json missing', {
      details: [path.normalize(path.relative(ROOT, packagePath))],
      fix: 'Restore package.json with scripts.',
    });
  }
  try {
    const parsed = PackageJsonSchema.parse(readJsonFile(packagePath));
    if (parsed.scripts === undefined) {
      fail(PREFIX, 'package.json scripts missing', {
        details: [path.normalize(path.relative(ROOT, packagePath))],
        fix: 'Add a scripts object to package.json.',
      });
    }
    return { scripts: parsed.scripts };
  } catch (err: unknown) {
    const message = asMessage(err);
    fail(PREFIX, `package.json scripts missing: ${message}`, {
      details: [path.normalize(path.relative(ROOT, packagePath))],
      fix: 'Fix invalid JSON in package.json.',
    });
  }
}

function parseGuardrailCalls(command: string): string[] {
  const calls: string[] = [];
  const regex = /npm\s+run\s+([^\s&]+)/g;
  for (const match of command.matchAll(regex)) {
    const name = match[1];
    if (typeof name === 'string' && name.length > 0) {
      calls.push(name);
    }
  }
  return calls;
}

type RunStep = {
  commands: string[];
};

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

function collectCiCommands(content: string): string[] {
  const steps = parseRunSteps(content.split(/\r?\n/));
  const commands: string[] = [];
  for (const step of steps) {
    for (const command of step.commands) {
      const trimmed = command.trim();
      if (trimmed.length === 0) continue;
      commands.push(trimmed);
    }
  }
  return commands;
}

function collectCiScriptCalls(content: string): string[] {
  const commands = collectCiCommands(content);
  const calls: string[] = [];
  for (const command of commands) {
    calls.push(...parseGuardrailCalls(command));
  }
  return calls;
}

function assertCheckCoverage(errors: Violation[]): void {
  const { scripts } = readPackageScripts();
  const checkCommand = scripts[CHECK_SCRIPT];
  const pkgPath = path.normalize(path.relative(ROOT, 'package.json'));
  if (checkCommand === undefined || checkCommand.trim().length === 0) {
    errors.push({ file: pkgPath, line: 1, col: 1, message: 'npm script "check" is missing' });
    return;
  }
  if (!checkCommand.includes(`npm run ${GUARDRAIL_ENTRYPOINT}`)) {
    errors.push({
      file: pkgPath,
      line: 1,
      col: 1,
      message: `"check" must invoke ${GUARDRAIL_ENTRYPOINT}`,
    });
  }

  const guardrailCommand = scripts[GUARDRAIL_ENTRYPOINT];
  if (guardrailCommand === undefined || guardrailCommand.trim().length === 0) {
    errors.push({
      file: pkgPath,
      line: 1,
      col: 1,
      message: `${GUARDRAIL_ENTRYPOINT} script missing or empty`,
    });
    return;
  }

  if (guardrailCommand.includes('scripts/guardrails/run.mts') === false) {
    errors.push({
      file: pkgPath,
      line: 1,
      col: 1,
      message: `${GUARDRAIL_ENTRYPOINT} must invoke scripts/guardrails/run.mts`,
    });
  }
  if (guardrailCommand.includes('--all') === false) {
    errors.push({
      file: pkgPath,
      line: 1,
      col: 1,
      message: `${GUARDRAIL_ENTRYPOINT} must pass --all`,
    });
  }
  if (guardrailCommand.includes('--aggregate') === true) {
    errors.push({
      file: pkgPath,
      line: 1,
      col: 1,
      message: `${GUARDRAIL_ENTRYPOINT} must not use --aggregate`,
    });
  }
}

function assertCiRunsCheck(errors: Violation[]): void {
  const ciPath = path.normalize(path.relative(ROOT, CI_WORKFLOW));
  if (fs.existsSync(CI_WORKFLOW) === false) {
    errors.push({ file: ciPath, line: 1, col: 1, message: 'ci.yml missing' });
    return;
  }
  const content = fs.readFileSync(CI_WORKFLOW, 'utf8');
  const calls = collectCiScriptCalls(content);
  const guardrailNames = Object.keys(GUARDRAILS);
  const guardrailSet = new Set(guardrailNames);
  const ciGuardrails = calls.filter((name) => guardrailSet.has(name));
  const runsCheck = calls.includes(CHECK_SCRIPT);
  const runsEntry = calls.includes(GUARDRAIL_ENTRYPOINT);
  const runsCiVerify = calls.includes(CI_ENTRYPOINT);

  if (!runsCiVerify) {
    errors.push({
      file: ciPath,
      line: 1,
      col: 1,
      message: `CI must run ${CI_ENTRYPOINT} to ensure guardrail coverage`,
    });
  }
  if (runsCheck || runsEntry || ciGuardrails.length > 0) {
    errors.push({
      file: ciPath,
      line: 1,
      col: 1,
      message: `CI must not run guardrails directly; use ${CI_ENTRYPOINT} only`,
    });
  }
}

function main(): void {
  const errors: Violation[] = [];

  assertCheckCoverage(errors);
  assertCiRunsCheck(errors);

  if (errors.length > 0) {
    const details = errors.map(
      (error) => `${error.file}:${error.line}:${error.col}: ${error.message}`
    );
    fail(PREFIX, 'CI does not cover all guardrails', {
      details,
      fix: 'Ensure CI runs npm run ci:verify and check includes guardrail entrypoint coverage.',
    });
  }

  process.stdout.write('ci-guardrail-coverage: ok\n');
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, {
    fix: 'Inspect check-ci-guardrail-coverage.mts for errors.',
  });
}
