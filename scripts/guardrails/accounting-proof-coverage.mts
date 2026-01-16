import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from '../lib/ensure-ts-esm.mjs';
import { fail } from './lib/fail.mjs';

ensureTsEsm();

const PREFIX = 'check:accounting-proof-coverage';
const ROOT = process.cwd();
const AXIOMS_PATH = path.join(ROOT, 'docs', 'accounting-axioms.md');
const FIX =
  'Update docs/accounting-axioms.md so every axiom has FULL coverage and at least one artifact.';

type AxiomRow = {
  id: string;
  label: string;
  artifacts: string;
  coverage: string;
};

const REQUIRED_IDS = new Set(
  Array.from({ length: 9 }, (_, index) => `A${index + 1}`)
);

function parseAxiomRows(content: string): Map<string, AxiomRow> {
  const rows = new Map<string, AxiomRow>();
  const lines = content.split(/\r?\n/);
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('| Axiom')) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!trimmed.startsWith('|')) {
      if (trimmed.length > 0) break;
      continue;
    }
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const label = cells[1] ?? '';
    const artifacts = cells[2] ?? '';
    const coverage = cells[3] ?? '';
    if (label === 'Axiom' || label.startsWith('---')) continue;
    const id = label.split('—')[0]?.trim() ?? '';
    if (!/^A\d+$/.test(id)) continue;
    if (rows.has(id)) {
      fail(PREFIX, `Accounting proof coverage violation:\n- Duplicate axiom row: ${id}`, {
        fix: FIX,
      });
    }
    rows.set(id, { id, label, artifacts, coverage });
  }

  return rows;
}

function parseArtifacts(cell: string): string[] {
  return cell
    .split(';')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function runAccountingProofCoverage(): void {
  if (!fs.existsSync(AXIOMS_PATH)) {
    fail(PREFIX, 'Accounting proof coverage violation:\n- Missing docs/accounting-axioms.md', {
      fix: FIX,
    });
  }
  const content = fs.readFileSync(AXIOMS_PATH, 'utf8');
  const rows = parseAxiomRows(content);
  const errors: string[] = [];

  for (const id of REQUIRED_IDS) {
    if (!rows.has(id)) {
      errors.push(`Axiom ${id} missing from coverage table`);
    }
  }

  for (const row of rows.values()) {
    const artifacts = parseArtifacts(row.artifacts);
    if (artifacts.length === 0) {
      errors.push(`Axiom ${row.id} has no artifacts listed`);
    }
    if (row.coverage !== 'FULL') {
      errors.push(`Axiom ${row.id} marked ${row.coverage}`);
    }
  }

  if (errors.length > 0) {
    fail(
      PREFIX,
      `Accounting proof coverage violation:\n- ${errors.join('\n- ')}`,
      { fix: FIX }
    );
  }

  process.stdout.write('check:accounting-proof-coverage: ok\n');
}

runAccountingProofCoverage();
