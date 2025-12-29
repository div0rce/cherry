import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';
import { asMessage } from './guardrails/lib/error.mts';
import { fail } from './guardrails/lib/fail.mts';

ensureTsEsm();


type ParityRow = {
  id: string;
  status: string;
};

const PREFIX = 'check:dev-ui-parity';
const FIX = 'Update docs/dev-ui-parity.md or implement missing surfaces.';

async function loadRows(): Promise<ParityRow[]> {
  const docPath = path.join(process.cwd(), 'docs', 'dev-ui-parity.md');
  const content = await readFile(docPath, 'utf8');
  return content
    .split('\n')
    .filter(
      (line) =>
        line.startsWith('|') &&
        !line.startsWith('|---') &&
        !line.toLowerCase().includes('backend feature id')
    )
    .map((line) => {
      const cells = line
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean);
      const [id = '', , , , , status = 'missing'] = cells;
      return { id, status };
    })
    .filter((row): row is ParityRow => row.id !== '' && row.status !== '');
}

async function main(): Promise<void> {
  const rows = await loadRows();
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const implemented = totals['implemented'] ?? 0;
  const missing = totals['missing'] ?? 0;
  const summary = `Dev UI parity: ${rows.length} features (${implemented} implemented, ${missing} missing).`;
  process.stdout.write(`${summary}\n`);

  if (missing > 0) {
    const missingRows = rows.filter((row) => row.status === 'missing');
    const details = missingRows.map((row) => `docs/dev-ui-parity.md:1:1: ${row.id}`);
    fail(PREFIX, 'Missing dev UI surfaces detected', { details, fix: FIX });
  }

  process.stdout.write('Dev UI parity check passed (no missing rows).\n');
}

void main().catch((error: unknown) => {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
});
