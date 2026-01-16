import * as fs from 'node:fs';
import * as path from 'node:path';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { fail } from './guardrails/lib/fail.mjs';

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

const REQUIRED_AXIOMS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9'] as const;

function parseAxiomRows(content: string): Map<string, AxiomRow> {
  const rows = new Map<string, AxiomRow>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trimStart().startsWith('|')) continue;
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 4) continue;
    const label = parts[1];
    const artifacts = parts[2];
    const coverage = parts[3];
    if (label === undefined || artifacts === undefined || coverage === undefined) continue;
    if (label === 'Axiom' || !label.startsWith('A')) continue;
    const id = label.split('—')[0]?.trim() ?? '';
    if (!/^A\d+$/.test(id)) continue;
    if (rows.has(id)) {
      fail(PREFIX, `Duplicate axiom row: ${id}`, { fix: FIX });
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

function main(): void {
  if (!fs.existsSync(AXIOMS_PATH)) {
    fail(PREFIX, 'Missing docs/accounting-axioms.md', { fix: FIX });
  }
  const content = fs.readFileSync(AXIOMS_PATH, 'utf8');
  const rows = parseAxiomRows(content);

  for (const id of REQUIRED_AXIOMS) {
    if (!rows.has(id)) {
      fail(PREFIX, `Missing required axiom ${id}`, { fix: FIX });
    }
  }

  for (const row of rows.values()) {
    const artifacts = parseArtifacts(row.artifacts);
    if (artifacts.length === 0) {
      fail(PREFIX, `Axiom ${row.id} has no artifacts`, { fix: FIX });
    }
    if (row.coverage !== 'FULL') {
      fail(PREFIX, `Axiom ${row.id} coverage is not FULL (${row.coverage})`, { fix: FIX });
    }
  }

  process.stdout.write('check:accounting-proof-coverage: ok\n');
}

main();
