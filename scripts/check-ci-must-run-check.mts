import fs from 'node:fs';
import path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();

const PREFIX = 'CI_CHECK_MISSING';
const MISSING_CHECK_MESSAGE = 'CI must run `npm run check`';
const ROOT_ENV = process.env['CHERRY_CI_MUST_RUN_CHECK_ROOT'];
const ROOT = ROOT_ENV !== undefined && ROOT_ENV !== ''
  ? path.resolve(ROOT_ENV)
  : process.cwd();
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const CI_WORKFLOW = path.join(WORKFLOWS_DIR, 'ci.yml');

function fail(message: string): never {
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exit(1);
}

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
    if (!match) continue;
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

function fileHasCheck(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const steps = parseRunSteps(lines);
  if (steps.length === 0) return false;
  const lastStep = steps[steps.length - 1];
  for (let i = lastStep.commands.length - 1; i >= 0; i -= 1) {
    const command = lastStep.commands[i];
    if (command === undefined) continue;
    if (command.trim().length === 0) continue;
    return commandIsRunCheck(command);
  }
  return false;
}

function main(): void {
  if (fs.existsSync(CI_WORKFLOW) === false) {
    fail(MISSING_CHECK_MESSAGE);
  }
  if (fileHasCheck(CI_WORKFLOW) === false) {
    fail(MISSING_CHECK_MESSAGE);
  }

  process.stdout.write('ci-must-run-check: ok\n');
}

main();
