import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ensureTsEsm } from './lib/ensure-ts-esm.mts';

ensureTsEsm();


type ParityRow = {
  id: string;
  status: string;
};

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
  try {
    const rows = await loadRows();
    const totals = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});

    const implemented = totals['implemented'] ?? 0;
    const missing = totals['missing'] ?? 0;
    const summary = `Dev UI parity: ${rows.length} features (${implemented} implemented, ${missing} missing).`;
    console.warn(summary);

    if (missing > 0) {
      const missingRows = rows.filter((row) => row.status === 'missing');
      console.error('Missing surfaces:');
      missingRows.forEach((row) => console.error(`- ${row.id}`));
      process.exitCode = 1;
      return;
    }

    console.warn('Dev UI parity check passed (no missing rows).');
  } catch (error: unknown) {
    console.error('Failed to read docs/dev-ui-parity.md', error);
    process.exitCode = 1;
  }
}

void main();
