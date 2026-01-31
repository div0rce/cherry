import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from '../guardrails/lib/fail.mjs';
import { runTool, type ToolResult } from '../guardrails/lib/run-tool.mjs';
import { resolveTmpRoot } from './tmp-root.mjs';

const requireFn = createRequire(import.meta.url);

const ROOT = process.cwd();
const TSX_PACKAGE_JSON = requireFn.resolve('tsx/package.json');
const TSX_CLI = path.join(path.dirname(TSX_PACKAGE_JSON), 'dist', 'cli.mjs');
const TSCONFIG = path.join(ROOT, 'tsconfig.scripts.json');
const PREFIX = 'run-ts-esm';

if (!TSX_CLI.includes(`${path.sep}tsx${path.sep}`)) {
  fail(PREFIX, 'Resolved tsx CLI outside tsx package', { details: [TSX_CLI] });
}
if (!fs.existsSync(TSX_CLI)) {
  fail(PREFIX, 'Resolved tsx CLI missing', { details: [TSX_CLI] });
}

export function runTsEsm(
  entry: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv
): ToolResult {
  const tmpRoot = resolveTmpRoot();
  const entryPath = path.isAbsolute(entry) ? entry : path.join(ROOT, entry);
  const nodeArgs: string[] = [];
  const scriptArgs: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === '--import' || arg === '-r' || arg === '--require') {
      const value = args[i + 1];
      if (value === undefined) {
        fail(PREFIX, `Missing value for ${arg}`, { details: [entryPath] });
      }
      nodeArgs.push(arg, value);
      i += 1;
      continue;
    }
    scriptArgs.push(arg);
  }
  const runEnv: NodeJS.ProcessEnv = {
    ...env,
    TMPDIR: tmpRoot,
    CHERRY_TMP_ROOT: process.env['CHERRY_TMP_ROOT'],
  };
  return runTool(
    process.execPath,
    [TSX_CLI, '--tsconfig', TSCONFIG, ...nodeArgs, entryPath, ...scriptArgs],
    {
      cwd: ROOT,
      env: runEnv,
    }
  );
}
