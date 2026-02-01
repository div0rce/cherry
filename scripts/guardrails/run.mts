import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { buildDeterministicEnv } from '../lib/deterministic-env.mjs';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { asMessage } from './lib/error.mjs';
import { fail } from './lib/fail.mjs';
import { importUnknown } from './lib/import-typed.mjs';
import { runTool } from './lib/run-tool.mjs';
import {
  GUARDRAILS,
  GUARDRAIL_NAMES,
  type GuardrailName,
} from './registry.mjs';

ensureTsEsm();
{
  const deterministic = buildDeterministicEnv();
  for (const key of Object.keys(process.env)) {
    if (!(key in deterministic)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(deterministic)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

const PREFIX = 'GUARDRAIL_RUNNER';
const ROOT = process.cwd();
const SUMMARY_PREFIX = 'GUARDRAIL_SUMMARY';
const REQUIRED_TOOLS = ['rg', 'git', 'node'] as const;
const AGGREGATE_FLAG = '--aggregate';
const ALL_FLAG = '--all';
const AGGREGATE_ALIASES = new Set(['check', 'all', 'check:guardrails']);
const AGGREGATE_SORT_FLAG = '--sort';
const AGGREGATE_SORT_PREFIX = `${AGGREGATE_SORT_FLAG}=`;
const AGGREGATE_SORT_VALUES = new Set(['registry', 'name']);
const TIER_FLAG = '--tier';
const TIER_PREFIX = `${TIER_FLAG}=`;
const TIER_VALUES = new Set(['core', 'env', 'all']);

type GuardrailTier = 'core' | 'env' | 'all';

type AggregateSort = 'registry' | 'name';

const TIER1_GUARDRAILS = new Set<GuardrailName>([
  'check:env-contract',
  'check:lockfile-sync',
  'check:tmp-root-safety',
  'check:temp-quota',
  'check:tmp-root-shape',
  'check:artifact-size-budgets',
  'check:evidence-present',
  'check:evidence-verifies',
]);

type FailureInfo = {
  message: string;
  details: string[];
  fix: string[];
};

type GuardrailFailure = {
  name: GuardrailName;
  message: string;
  details: string[];
  fix: string[];
  exitCode: number;
  durationMs: number;
};

type GuardrailResult = {
  name: GuardrailName;
  ok: boolean;
  failure?: GuardrailFailure;
};

function verifyTool(tool: (typeof REQUIRED_TOOLS)[number]): string {
  // Invariant: guardrails only run if required tools are available on PATH.
  try {
    const result = runTool(tool, ['--version'], { allowMissingTool: true });
    if (result.exitCode !== 0) {
      const details = [
        `stdout=${result.stdout.trim()}`,
        `stderr=${result.stderr.trim()}`,
      ];
      fail('GUARDRAIL_TOOL_MISSING', `${tool} is not available`, {
        details,
        fix: `Install ${tool} and ensure it is on PATH before running guardrails.`,
      });
    }
    const firstLine = result.stdout.split('\n')[0] ?? '';
    return firstLine.trim().length > 0 ? firstLine.trim() : 'unknown';
  } catch (err: unknown) {
    const message = asMessage(err);
    fail('GUARDRAIL_TOOL_MISSING', `${tool} is not available`, {
      details: [`error=${message}`],
      fix: `Install ${tool} and ensure it is on PATH before running guardrails.`,
    });
  }
}

function logToolVersions(): void {
  const versions = new Map<string, string>();
  for (const tool of REQUIRED_TOOLS) {
    versions.set(tool, verifyTool(tool));
  }
  process.stdout.write(
    `GUARDRAIL_TOOL_VERSION: rg=${versions.get('rg') ?? 'unknown'}\n`
  );
}

function isGuardrailName(value: string): value is GuardrailName {
  return Object.prototype.hasOwnProperty.call(GUARDRAILS, value);
}

class GuardrailExit extends Error {
  constructor(readonly code: number) {
    super(`Guardrail exit ${code}`);
  }
}

function stripAggregateFlag(args: string[]): { aggregate: boolean; rest: string[] } {
  let aggregate = false;
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === AGGREGATE_FLAG) {
      aggregate = true;
      continue;
    }
    rest.push(arg);
  }
  return { aggregate, rest };
}

function stripAllFlag(args: string[]): { all: boolean; rest: string[] } {
  let all = false;
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === ALL_FLAG) {
      all = true;
      continue;
    }
    rest.push(arg);
  }
  return { all, rest };
}

function stripTierFlag(args: string[]): { tier: GuardrailTier; rest: string[] } {
  let tier: GuardrailTier = 'all';
  const rest: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? '';
    if (arg === TIER_FLAG) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('-')) {
        fail(PREFIX, 'Tier value required', {
          fix: 'Use --tier=core, --tier=env, or --tier=all.',
        });
      }
      if (!TIER_VALUES.has(value)) {
        fail(PREFIX, `Unknown tier: ${value}`, {
          fix: 'Use --tier=core, --tier=env, or --tier=all.',
        });
      }
      tier = value as GuardrailTier;
      i += 1;
      continue;
    }
    if (arg.startsWith(TIER_PREFIX)) {
      const value = arg.slice(TIER_PREFIX.length);
      if (!TIER_VALUES.has(value)) {
        fail(PREFIX, `Unknown tier: ${value}`, {
          fix: 'Use --tier=core, --tier=env, or --tier=all.',
        });
      }
      tier = value as GuardrailTier;
      continue;
    }
    rest.push(arg);
  }
  return { tier, rest };
}

function hasCherryTmpRoot(): boolean {
  const value = process.env['CHERRY_TMP_ROOT'];
  return value !== undefined && value.trim().length > 0;
}

function selectTierGuardrails(
  tier: GuardrailTier,
  envReady: boolean,
  ciMode: boolean
): { names: GuardrailName[]; skippedTier1: boolean } {
  const tier0 = GUARDRAIL_NAMES.filter((name) => !TIER1_GUARDRAILS.has(name));
  const tier1 = GUARDRAIL_NAMES.filter((name) => TIER1_GUARDRAILS.has(name));

  if (tier === 'core') {
    return { names: tier0, skippedTier1: false };
  }

  if (tier === 'env') {
    if (!envReady) {
      fail(PREFIX, 'Tier 1 guardrails require CHERRY_TMP_ROOT', {
        fix: 'Set CHERRY_TMP_ROOT and rerun check:env.',
      });
    }
    return { names: tier1, skippedTier1: false };
  }

  if (!envReady) {
    const message = 'Tier 1 skipped: missing CHERRY_TMP_ROOT';
    if (ciMode) {
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(`${message}\n`);
    }
    return { names: tier0, skippedTier1: true };
  }

  return { names: [...tier0, ...tier1], skippedTier1: false };
}

function resolveAggregateNames(raw: string[]): GuardrailName[] {
  if (raw.length === 0) return [...GUARDRAIL_NAMES];
  if (raw.length === 1 && AGGREGATE_ALIASES.has(raw[0] ?? '')) {
    return [...GUARDRAIL_NAMES];
  }
  const requested = new Set<GuardrailName>();
  for (const name of raw) {
    if (!isGuardrailName(name)) {
      fail(PREFIX, `Unknown guardrail: ${name}`, {
        fix: 'Use a guardrail registered in scripts/guardrails/registry.mts.',
      });
    }
    requested.add(name);
  }
  // Aggregate output order is defined by GUARDRAIL_NAMES (registry order).
  return GUARDRAIL_NAMES.filter((name) => requested.has(name));
}

function parseAggregateSort(value: string): AggregateSort {
  if (AGGREGATE_SORT_VALUES.has(value)) return value as AggregateSort;
  fail(PREFIX, `Unknown aggregate sort: ${value}`, {
    fix: 'Use --sort=registry (default) or --sort=name.',
  });
}

function parseAggregateArgs(raw: string[]): { names: GuardrailName[]; sort: AggregateSort } {
  let sort: AggregateSort = 'registry';
  const names: string[] = [];
  const flagArgs: string[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i] ?? '';
    if (arg === AGGREGATE_SORT_FLAG) {
      const value = raw[i + 1];
      if (value === undefined || value.startsWith('-')) {
        fail(PREFIX, 'Aggregate sort value required', {
          fix: 'Use --sort=name or --sort=registry.',
        });
      }
      sort = parseAggregateSort(value);
      i += 1;
      continue;
    }
    if (arg.startsWith(AGGREGATE_SORT_PREFIX)) {
      sort = parseAggregateSort(arg.slice(AGGREGATE_SORT_PREFIX.length));
      continue;
    }
    // Aggregate mode accepts guardrail names only; per-guardrail args are unsupported.
    if (arg.startsWith('-')) {
      flagArgs.push(arg);
      continue;
    }
    names.push(arg);
  }

  if (flagArgs.length > 0) {
    fail(
      PREFIX,
      'aggregate mode does not accept per-guardrail args; run guardrail directly for parameterized execution.',
      { details: flagArgs }
    );
  }

  const resolved = resolveAggregateNames(names);
  const ordered = sort === 'name' ? [...resolved].sort() : resolved;
  return { names: ordered, sort };
}

function parseFailureText(text: string): FailureInfo {
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { message: 'Guardrail failed', details: [], fix: [] };
  }
  const detailsIndex = lines.indexOf('DETAILS:');
  const fixIndex = lines.indexOf('FIX:');
  const message = lines[0] ?? 'Guardrail failed';
  const details =
    detailsIndex >= 0
      ? lines.slice(detailsIndex + 1, fixIndex >= 0 ? fixIndex : lines.length)
      : [];
  const fix = fixIndex >= 0 ? lines.slice(fixIndex + 1) : [];
  return { message, details, fix };
}

function normalizeFailureMessage(name: GuardrailName, info: FailureInfo): FailureInfo {
  const prefix = `${name}: `;
  if (info.message.startsWith(prefix)) {
    return { ...info, message: info.message.slice(prefix.length) };
  }
  return info;
}

function formatAggregateReport(
  failures: GuardrailFailure[],
  orderLabel: AggregateSort
): string {
  const sep = '-'.repeat(40);
  const lines: string[] = [
    sep,
    `GUARDRAIL FAILURES (${failures.length})`,
    `ORDER: ${orderLabel}`,
    sep,
    '',
  ];

  failures.forEach((failure, index) => {
    lines.push(`${index + 1}) ${failure.name}`);
    lines.push(`   exit=${failure.exitCode} timeMs=${failure.durationMs}`);
    lines.push(`   ${failure.message}`);
    for (const detail of failure.details) {
      lines.push(`     - ${detail}`);
    }
    if (failure.fix.length > 0) {
      lines.push('   FIX:');
      for (const fix of failure.fix) {
        lines.push(`     - ${fix}`);
      }
    }
    lines.push('');
  });

  lines.push(sep, 'Run without --aggregate to fail fast.', sep);
  return `${lines.join('\n')}\n`;
}

async function runGuardrail(
  name: GuardrailName,
  passThrough: string[],
  aggregate: boolean
): Promise<GuardrailResult> {
  const relativePath = GUARDRAILS[name];
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath) === false) {
    fail(PREFIX, `Guardrail script missing: ${relativePath}`, {
      fix: 'Restore the guardrail script or update the registry.',
    });
  }

  const executable = process.argv[0] ?? 'node';
  const originalArgv = process.argv;
  process.argv = [executable, absolutePath, ...passThrough];

  const start = performance.now();
  const stderrChunks: string[] = [];
  const originalExit = process.exit.bind(process);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const restore = (): void => {
    process.exit = originalExit;
    process.stderr.write = originalStderrWrite;
    process.argv = originalArgv;
  };

  const forwardStderr = !aggregate;
  process.stderr.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: (err?: Error) => void) => {
    if (typeof chunk === 'string') {
      stderrChunks.push(chunk);
    } else if (Buffer.isBuffer(chunk)) {
      stderrChunks.push(chunk.toString('utf8'));
    }
    if (!forwardStderr) return true;
    return originalStderrWrite(chunk as Buffer, encoding as BufferEncoding, cb as () => void);
  }) as typeof process.stderr.write;
  process.exit = ((code?: number) => {
    throw new GuardrailExit(typeof code === 'number' ? code : 1);
  }) as typeof process.exit;

  try {
    await importUnknown(absolutePath);
    return { name, ok: true };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    restore();

    const stderrText = stderrChunks.join('').trim();

    if (err instanceof GuardrailExit) {
      if (!aggregate) {
        process.stdout.write(
          `${SUMMARY_PREFIX}: guardrail=${name} exit=${err.code} timeMs=${durationMs} next="npm run ${name}"\n`
        );
        if (stderrText.length === 0) {
          process.stderr.write(
            `${name}: Guardrail failed without output\nFix:\nRun npm run ${name} for details.\n`
          );
        }
        process.exitCode = err.code;
      }
      const info = normalizeFailureMessage(name, parseFailureText(stderrText));
      return {
        name,
        ok: false,
        failure: {
          name,
          message: info.message,
          details: info.details,
          fix: info.fix,
          exitCode: err.code,
          durationMs,
        },
      };
    }

    if (err instanceof Error && err.name === 'GuardrailFailure') {
      if (!aggregate) {
        process.stdout.write(
          `${SUMMARY_PREFIX}: guardrail=${name} exit=1 timeMs=${durationMs} next="npm run ${name}"\n`
        );
        if (stderrText.length === 0) {
          process.stderr.write(
            `${name}: Guardrail failed without output\nFix:\nRun npm run ${name} for details.\n`
          );
        }
        process.exitCode = 1;
      }
      const info = normalizeFailureMessage(name, parseFailureText(err.message));
      return {
        name,
        ok: false,
        failure: {
          name,
          message: info.message,
          details: info.details,
          fix: info.fix,
          exitCode: 1,
          durationMs,
        },
      };
    }

    const message = asMessage(err);
    if (!aggregate) {
      process.stdout.write(
        `${SUMMARY_PREFIX}: guardrail=${name} exit=1 timeMs=${durationMs} next="npm run ${name}"\n`
      );
      process.stderr.write(
        `${name}: Guardrail crashed: ${message}\nFix:\nInspect ${relativePath} for errors.\n`
      );
      process.exitCode = 1;
    }

    const info = normalizeFailureMessage(
      name,
      parseFailureText(stderrText.length > 0 ? stderrText : `Guardrail crashed: ${message}`)
    );

    return {
      name,
      ok: false,
      failure: {
        name,
        message: info.message,
        details: info.details,
        fix: info.fix,
        exitCode: 1,
        durationMs,
      },
    };
  } finally {
    restore();
  }
}

async function main(): Promise<void> {
  const aggregateStrip = stripAggregateFlag(process.argv.slice(2));
  const allStrip = stripAllFlag(aggregateStrip.rest);
  const aggregate = aggregateStrip.aggregate;
  const all = allStrip.all;
  const tierStrip = stripTierFlag(allStrip.rest);
  const tier = tierStrip.tier;
  const rest = tierStrip.rest;
  const ciMode = process.env['CI'] === 'true';
  const envReady = hasCherryTmpRoot();

  if (aggregate === true && all === true) {
    fail(PREFIX, 'Use either --aggregate or --all, not both', {
      fix: 'Remove one of the flags.',
    });
  }

  logToolVersions();

  if (aggregate === false && all === false) {
    const name = rest[0];
    if (name === undefined || name.length === 0) {
      fail(PREFIX, 'Guardrail name required', {
        fix: 'Run via npm run check:<name>.',
      });
    }
    if (!isGuardrailName(name)) {
      fail(PREFIX, `Unknown guardrail: ${name}`, {
        fix: 'Use a guardrail registered in scripts/guardrails/registry.mts.',
      });
    }
    await runGuardrail(name, rest.slice(1), false);
    return;
  }

  if (all === true) {
    const selection = selectTierGuardrails(tier, envReady, ciMode);
    for (const name of selection.names) {
      const result = await runGuardrail(name, [], false);
      if (result.ok === false) {
        return;
      }
    }
    process.stdout.write('guardrail-fail-fast: ok\n');
    return;
  }

  const { names: requestedNames, sort } = parseAggregateArgs(rest);
  const selection = selectTierGuardrails(tier, envReady, ciMode);
  const names = requestedNames.filter((name) => selection.names.includes(name));
  const failures: GuardrailFailure[] = [];
  for (const name of names) {
    const result = await runGuardrail(name, [], true);
    if (result.ok !== true && result.failure !== undefined) {
      failures.push(result.failure);
    }
  }

  if (failures.length > 0) {
    process.stderr.write(formatAggregateReport(failures, sort));
    process.exitCode = 1;
    return;
  }

  process.stdout.write('guardrail-aggregate: ok\n');
}

void main().catch((err: unknown) => {
  const message = asMessage(err);
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exitCode = 1;
});
