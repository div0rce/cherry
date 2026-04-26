import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');
const command = `
  rg -n \
    -e "CREDIT_CARD_MISSING_LINKED_DEBT" \
    -e "MISSING_LINKED_DEBT" \
    -e "missing linked debt" \
    -e "MissingDebtTruth" \
    -e "MISSING_DEBT_TRUTH" \
    -e "creditMissingDebtTruth" \
    -e "missing debt truth" \
    -g '!tests/credit-liability-naming-closeout.test.js' \
    -g '!tests/node/credit-liability-naming-closeout.test.js' \
    app lib tests docs
`;

const result = spawnSync('bash', ['-lc', command], {
  cwd: repoRoot,
  encoding: 'utf8',
});

if (result.status === 0) {
  const output = typeof result.stdout === 'string' ? result.stdout.trim() : '';
  throw new Error(output === '' ? 'stale 8.3 liability naming detected' : output);
}

if (result.status !== 1) {
  throw result.error ?? new Error(`Unexpected exit status from rg: ${result.status}`);
}

process.stdout.write('credit-liability-naming-closeout: ok\n');
