import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mts';
import { asMessage } from './lib/error.mts';
import { fail } from './lib/fail.mts';
import { importUnknown } from './lib/import-typed.mts';
import { runTool } from './lib/run-tool.mts';
import { GUARDRAILS, type GuardrailName } from './registry.mts';

ensureTsEsm();

const PREFIX = 'GUARDRAIL_RUNNER';
const ROOT = process.cwd();
const SUMMARY_PREFIX = 'GUARDRAIL_SUMMARY';

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
    const rgVersion = runTool('rg', ['--version']);
    if (rgVersion.exitCode !== 0) {
      const details: string[] = [];
      if (rgVersion.stdout.trim().length > 0) {
        details.push(`stdout: ${rgVersion.stdout.trim()}`);
      }
      if (rgVersion.stderr.trim().length > 0) {
        details.push(`stderr: ${rgVersion.stderr.trim()}`);
      }
      fail(PREFIX, `rg --version failed with status ${rgVersion.exitCode}`, {
        details,
        fix: 'Install ripgrep and ensure it is available on PATH.',
      });
    }
    const versionLine = rgVersion.stdout.split('\n')[0] ?? '';
    const versionLabel = versionLine.trim().length > 0 ? versionLine.trim() : 'unknown';
    process.stdout.write(`GUARDRAIL_TOOL_VERSION: rg=${versionLabel}\n`);

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
