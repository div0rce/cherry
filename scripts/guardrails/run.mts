import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { asMessage } from './lib/error.mjs';
import { fail } from './lib/fail.mjs';
import { importUnknown } from './lib/import-typed.mjs';
import { runTool } from './lib/run-tool.mjs';
import { GUARDRAILS, type GuardrailName } from './registry.mjs';

ensureTsEsm();

const PREFIX = 'GUARDRAIL_RUNNER';
const ROOT = process.cwd();
const SUMMARY_PREFIX = 'GUARDRAIL_SUMMARY';
const REQUIRED_TOOLS = ['rg', 'git', 'node'] as const;

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

function isGuardrailName(value: string): value is GuardrailName {
  return Object.prototype.hasOwnProperty.call(GUARDRAILS, value);
}

class GuardrailExit extends Error {
  constructor(readonly code: number) {
    super(`Guardrail exit ${code}`);
  }
}

async function runGuardrail(): Promise<void> {
  const args = process.argv.slice(2);
  const name = args[0];
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

  const relativePath = GUARDRAILS[name];
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath) === false) {
    fail(PREFIX, `Guardrail script missing: ${relativePath}`, {
      fix: 'Restore the guardrail script or update the registry.',
    });
  }

  const executable = process.argv[0] ?? 'node';
  process.argv = [executable, absolutePath, ...args.slice(1)];

  const start = performance.now();
  const stderrChunks: string[] = [];
  const originalExit = process.exit.bind(process);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);
  const restore = (): void => {
    process.exit = originalExit;
    process.stderr.write = originalStderrWrite;
  };

  process.stderr.write = ((chunk: unknown, encoding?: BufferEncoding, cb?: (err?: Error) => void) => {
    if (typeof chunk === 'string') {
      stderrChunks.push(chunk);
    } else if (Buffer.isBuffer(chunk)) {
      stderrChunks.push(chunk.toString('utf8'));
    }
    return originalStderrWrite(chunk as Buffer, encoding as BufferEncoding, cb as () => void);
  }) as typeof process.stderr.write;
  process.exit = ((code?: number) => {
    throw new GuardrailExit(typeof code === 'number' ? code : 1);
  }) as typeof process.exit;

  try {
    const versions = new Map<string, string>();
    for (const tool of REQUIRED_TOOLS) {
      versions.set(tool, verifyTool(tool));
    }
    process.stdout.write(`GUARDRAIL_TOOL_VERSION: rg=${versions.get('rg') ?? 'unknown'}\n`);

    await importUnknown(absolutePath);
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    restore();

    if (err instanceof GuardrailExit) {
      process.stdout.write(
        `${SUMMARY_PREFIX}: guardrail=${name} exit=${err.code} timeMs=${durationMs} next="npm run ${name}"\n`
      );
      const output = stderrChunks.join('').trim();
      if (output.length === 0) {
        process.stderr.write(
          `${name}: Guardrail failed without output\nFix:\nRun npm run ${name} for details.\n`
        );
      }
      process.exitCode = err.code;
      return;
    }

    if (err instanceof Error && err.name === 'GuardrailFailure') {
      process.stdout.write(
        `${SUMMARY_PREFIX}: guardrail=${name} exit=1 timeMs=${durationMs} next="npm run ${name}"\n`
      );
      const output = stderrChunks.join('').trim();
      if (output.length === 0) {
        process.stderr.write(
          `${name}: Guardrail failed without output\nFix:\nRun npm run ${name} for details.\n`
        );
      }
      process.exitCode = 1;
      return;
    }

    const message = asMessage(err);
    process.stdout.write(
      `${SUMMARY_PREFIX}: guardrail=${name} exit=1 timeMs=${durationMs} next="npm run ${name}"\n`
    );
    process.stderr.write(
      `${name}: Guardrail crashed: ${message}\nFix:\nInspect ${relativePath} for errors.\n`
    );
    process.exitCode = 1;
  } finally {
    restore();
  }
}

void runGuardrail().catch((err: unknown) => {
  const message = asMessage(err);
  process.stderr.write(`${PREFIX}: ${message}\n`);
  process.exitCode = 1;
});
