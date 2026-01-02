import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
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
  allowMissingTool?: boolean;
};

export type SpawnToolOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdio?: Parameters<typeof spawn>[2]['stdio'];
};

const INTERNAL_ERROR = 'GUARDRAIL_INTERNAL_ERROR';
const INTERNAL_FIX =
  'Ensure the tool is installed and invoked via scripts/guardrails/lib/run-tool.mts.';
const requireFn = createRequire(import.meta.url);

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

function resolveToolPath(tool: string): string | null {
  if (tool !== 'rg') return null;
  try {
    const moduleExports = requireFn('@vscode/ripgrep') as { rgPath?: string };
    if (typeof moduleExports.rgPath === 'string' && moduleExports.rgPath.length > 0) {
      return moduleExports.rgPath;
    }
  } catch (error: unknown) {
    void asMessage(error);
  }
  return null;
}

export function runTool(tool: string, args: string[], options: RunToolOptions = {}): ToolResult {
  let result = spawnSync(tool, args, {
    encoding: 'utf8',
    cwd: options.cwd,
    env: options.env,
    input: options.input,
  });
  let stdout = normalizeOutput(result.stdout);
  let stderr = normalizeOutput(result.stderr);
  if (result.status == null) {
    const errorMessage = result.error ? asMessage(result.error) : undefined;
    const errorCode =
      result.error && typeof result.error === 'object'
        ? (result.error as NodeJS.ErrnoException).code
        : undefined;
    if (errorCode === 'ENOENT') {
      const fallbackTool = resolveToolPath(tool);
      if (fallbackTool !== null && fallbackTool !== tool) {
        result = spawnSync(fallbackTool, args, {
          encoding: 'utf8',
          cwd: options.cwd,
          env: options.env,
          input: options.input,
        });
        stdout = normalizeOutput(result.stdout);
        stderr = normalizeOutput(result.stderr);
        if (result.status == null) {
          const fallbackMessage = result.error ? asMessage(result.error) : errorMessage;
          if (options.allowMissingTool === true) {
            return {
              ok: false,
              exitCode: 127,
              stdout,
              stderr: fallbackMessage ?? stderr,
              tool: fallbackTool,
              args,
            };
          }
          failNullExit(fallbackTool, stdout, stderr, fallbackMessage);
        }
        return {
          ok: result.status === 0,
          exitCode: result.status,
          stdout,
          stderr,
          tool: fallbackTool,
          args,
        };
      }
      if (options.allowMissingTool === true) {
        return {
          ok: false,
          exitCode: 127,
          stdout,
          stderr: errorMessage ?? stderr,
          tool,
          args,
        };
      }
    }
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

export function spawnTool(
  tool: string,
  args: string[],
  options: SpawnToolOptions = {}
): ReturnType<typeof spawn> {
  return spawn(tool, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? 'pipe',
  });
}
