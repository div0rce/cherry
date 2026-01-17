import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from '../guardrails/lib/fail.mjs';
import { runTool, type ToolResult } from '../guardrails/lib/run-tool.mjs';

const requireFn = createRequire(import.meta.url);

const ROOT = process.cwd();
const TSX_CLI = requireFn.resolve('tsx/cli');
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
  const entryPath = path.isAbsolute(entry) ? entry : path.join(ROOT, entry);
  return runTool(process.execPath, [TSX_CLI, '--tsconfig', TSCONFIG, entryPath, ...args], {
    cwd: ROOT,
    env,
  });
}
