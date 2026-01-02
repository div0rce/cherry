import { spawnSync } from 'node:child_process';
import { asMessage } from './error.mts';
import { fail } from './fail.mts';

export type ToolResult = {
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  tool: string;
  args: string[];
};

export type RunToolOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  input?: string;
};

const INTERNAL_ERROR = 'GUARDRAIL_INTERNAL_ERROR';
const INTERNAL_FIX =
  'Ensure the tool is installed and invoked via scripts/guardrails/lib/run-tool.mts.';

function normalizeOutput(output: unknown): string {
  if (typeof output === 'string') return output;
  if (Buffer.isBuffer(output)) return output.toString('utf8');
  return '';
}

function failNullExit(tool: string, stdout: string, stderr: string, errorMessage?: string): never {
  const lines: string[] = [INTERNAL_ERROR, `tool=${tool}`, 'reason=non-deterministic exit code'];
  if (errorMessage !== undefined && errorMessage.length > 0) {
    lines.push(`error=${errorMessage}`);
  }
  if (stdout.trim().length > 0) {
    lines.push(`stdout=${stdout.trim()}`);
  }
  if (stderr.trim().length > 0) {
    lines.push(`stderr=${stderr.trim()}`);
  }
  process.stderr.write(`${lines.join('\n')}\n`);
  fail(INTERNAL_ERROR, `${tool} returned an undefined exit code.`, { fix: INTERNAL_FIX });
}

export function runTool(tool: string, args: string[], options: RunToolOptions = {}): ToolResult {
  const result = spawnSync(tool, args, {
    encoding: 'utf8',
    cwd: options.cwd,
    env: options.env,
    input: options.input,
  });
  const stdout = normalizeOutput(result.stdout);
  const stderr = normalizeOutput(result.stderr);
  if (result.status == null) {
    const errorMessage = result.error ? asMessage(result.error) : undefined;
    failNullExit(tool, stdout, stderr, errorMessage);
  }
  const exitCode = result.status;
  return {
    ok: exitCode === 0,
    exitCode,
    stdout,
    stderr,
    tool,
    args,
  };
}
