import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from '../../lib/ensure-ts-esm.mjs';
import { fail } from '../lib/fail.mjs';
import { PackageJsonSchema, readJsonFile } from '../lib/read-json.mjs';
import { GUARDRAILS, GUARDRAIL_ENTRYPOINT, GUARDRAIL_NAMES, type GuardrailName } from '../registry.mjs';

ensureTsEsm();

const PREFIX = 'check:guardrail-execution-parity';
const ROOT = process.cwd();
const FIX = 'Ensure both check and check:aggregate run GUARDRAIL_NAMES directly with registry order.';

const RUNNER_PATH = path.join(ROOT, 'scripts', 'guardrails', 'run.mts');
const AGGREGATE_PATH = path.join(ROOT, 'scripts', 'guardrails-aggregate.mts');
const PACKAGE_PATH = path.join(ROOT, 'package.json');

const FORBIDDEN_ENUMERATORS = [
  /Object\.keys\(GUARDRAILS\)/,
  /Object\.entries\(GUARDRAILS\)/,
  /Object\.values\(GUARDRAILS\)/,
  /for\s*\([^)]*\bin\s+GUARDRAILS\b/,
] as const;

function assertRunnerExists(): void {
  if (fs.existsSync(RUNNER_PATH) === false) {
    fail(PREFIX, 'execution parity violated', {
      details: [`missingRunner: ${path.relative(ROOT, RUNNER_PATH)}`],
      fix: FIX,
    });
  }
}

function parsePackageScripts(): Record<string, string> {
  if (fs.existsSync(PACKAGE_PATH) === false) {
    fail(PREFIX, 'execution parity violated', {
      details: ['missingPackageJson'],
      fix: FIX,
    });
  }
  const parsed = PackageJsonSchema.parse(readJsonFile(PACKAGE_PATH));
  const scripts = parsed.scripts;
  if (scripts === undefined) {
    fail(PREFIX, 'execution parity violated', {
      details: ['missingScriptsInPackageJson'],
      fix: FIX,
    });
  }
  return scripts;
}

function collectNameParityErrors(): string[] {
  const registryNames = Object.keys(GUARDRAILS) as GuardrailName[];
  const names = [...GUARDRAIL_NAMES];
  const registrySet = new Set(registryNames);
  const nameSet = new Set(names);

  const errors: string[] = [];
  const missing = registryNames.filter((name) => nameSet.has(name) === false);
  const extra = names.filter((name) => registrySet.has(name) === false);

  if (missing.length !== 0) {
    errors.push(`missingInNames: [${missing.join(', ')}]`);
  }
  if (extra.length !== 0) {
    errors.push(`extraInNames: [${extra.join(', ')}]`);
  }
  if (registryNames.length === names.length) {
    for (let i = 0; i < registryNames.length; i += 1) {
      const expected = registryNames[i];
      const actual = names[i];
      if (expected !== actual) {
        errors.push(`orderMismatchAt: index ${i} expected ${expected ?? ''} got ${actual ?? ''}`);
        break;
      }
    }
  }

  return errors;
}

function assertRunnerUsesGuardrailNames(): string[] {
  const errors: string[] = [];
  const content = fs.readFileSync(RUNNER_PATH, 'utf8');

  const usesGuardrailNames = content.includes('GUARDRAIL_NAMES');
  if (usesGuardrailNames === false) {
    errors.push('runnerMissing: GUARDRAIL_NAMES reference not found');
  }

  if (/return\s*\[\s*\.\.\.GUARDRAIL_NAMES\s*\]/.test(content) === false) {
    errors.push('runnerMissing: resolveAggregateNames must return GUARDRAIL_NAMES');
  }

  if (/for\s*\(\s*const\s+\w+\s+of\s+GUARDRAIL_NAMES\s*\)/.test(content) === false) {
    errors.push('runnerMissing: fail-fast loop must iterate GUARDRAIL_NAMES');
  }

  if (/runGuardrail\(\s*\w+\s*,\s*\[\]\s*,\s*true\s*\)/.test(content) === false) {
    errors.push('runnerMissing: aggregate must run guardrails with empty args');
  }

  if (/runGuardrail\(\s*\w+\s*,\s*\[\]\s*,\s*false\s*\)/.test(content) === false) {
    errors.push('runnerMissing: fail-fast --all must run guardrails with empty args');
  }

  const aliasMatch = content.match(/AGGREGATE_ALIASES\s*=\s*new Set\s*\(\s*\[([\s\S]*?)\]\s*\)/);
  if (aliasMatch === null) {
    errors.push('runnerMissing: aggregate aliases definition not found');
  } else {
    const aliasBody = aliasMatch[1] ?? '';
    const requiredAliases = ['check', 'all', 'check:guardrails'];
    for (const alias of requiredAliases) {
      if (aliasBody.includes(`'${alias}'`) === false) {
        errors.push(`runnerMissing: aggregate alias ${alias}`);
      }
    }
  }

  const forbidden = FORBIDDEN_ENUMERATORS.filter((pattern) => pattern.test(content));
  if (forbidden.length !== 0) {
    errors.push(`runnerUsesForbiddenEnumerator: ${forbidden.map((item) => String(item)).join(', ')}`);
  }

  return errors;
}

function assertAggregateEntrypoint(): string[] {
  if (fs.existsSync(AGGREGATE_PATH) === false) {
    return [`missingAggregateRunner: ${path.relative(ROOT, AGGREGATE_PATH)}`];
  }
  const content = fs.readFileSync(AGGREGATE_PATH, 'utf8');
  if (content.includes("'scripts/guardrails/run.mts'") === false) {
    return ['aggregateRunnerMissing: scripts/guardrails/run.mts'];
  }
  if (content.includes("'--aggregate'") === false) {
    return ['aggregateRunnerMissing: --aggregate'];
  }
  return [];
}

function assertPackageEntrypoints(scripts: Record<string, string>): string[] {
  const errors: string[] = [];
  const checkCommand = scripts['check'];
  const guardrailCommand = scripts[GUARDRAIL_ENTRYPOINT];

  if (checkCommand === undefined || checkCommand.trim().length === 0) {
    errors.push('missingCheckScript');
  } else if (checkCommand.includes(`npm run ${GUARDRAIL_ENTRYPOINT}`) === false) {
    errors.push(`checkMissingEntrypoint: ${GUARDRAIL_ENTRYPOINT}`);
  }

  if (guardrailCommand === undefined || guardrailCommand.trim().length === 0) {
    errors.push(`missingEntrypoint: ${GUARDRAIL_ENTRYPOINT}`);
  } else {
    if (guardrailCommand.includes('scripts/guardrails/run.mts') === false) {
      errors.push('guardrailsEntrypointMissingRunner');
    }
    if (guardrailCommand.includes('--all') === false) {
      errors.push('guardrailsEntrypointMissingAllFlag');
    }
    if (guardrailCommand.includes('--aggregate') === true) {
      errors.push('guardrailsEntrypointUsesAggregate');
    }
  }

  return errors;
}

function main(): void {
  assertRunnerExists();

  const errors = [
    ...collectNameParityErrors(),
    ...assertRunnerUsesGuardrailNames(),
    ...assertAggregateEntrypoint(),
  ];

  const scripts = parsePackageScripts();
  errors.push(...assertPackageEntrypoints(scripts));

  if (errors.length !== 0) {
    fail(PREFIX, 'execution parity violated', {
      details: errors,
      fix: FIX,
    });
  }

  process.stdout.write('check:guardrail-execution-parity: ok\n');
}

main();
