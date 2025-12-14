import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const env = {
  ...process.env,
  NODE_ENV: 'test',
  TS_NODE_COMPILER_OPTIONS:
    '{"module":"CommonJS","moduleResolution":"node","baseUrl":".","paths":{"@/*":["./*"]},"allowJs":true}',
};

function runGuardrail(file) {
  if (!fs.existsSync(file)) {
    process.stderr.write(`guardrails: missing file: ${file}\n`);
    process.exit(1);
  }
  const res = spawnSync(
    'node',
    ['-r', 'ts-node/register/transpile-only', '-r', 'tsconfig-paths/register', file],
    { stdio: 'inherit', env }
  );
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

const guardrails = [
  'tests/autopilot-runsimulation-literals.test.ts',
  'tests/autopilot-decisionpanel-literals.test.ts',
  'tests/autopilot-purchaseform-literals.test.ts',
];

for (const file of guardrails) {
  runGuardrail(file);
}

process.stdout.write('guardrails: ok\n');
