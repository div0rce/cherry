import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runSimulationPath = path.resolve(__dirname, '../lib/autopilot/runSimulation.ts');

/**
 * Guardrail intent:
 * - runSimulation is AdapterSemantics v1; do not silently expand user-facing copy.
 * - Ignore imports, HTTP constants, classNames, and enum-ish/internal tokens.
 * - Fail when new human-readable literals appear outside the allowlist.
 */

// Protocol/operational literals the adapter is allowed to contain.
const ALLOWED_OPS_LITERALS = new Set<string>([
  'autopilot-recommendation',
  'alternate-card',
  'INVALID_SIMULATION_SUMMARY',
  'PREVIEW_REQUEST_FAILED',
  'PREVIEW_ERROR',
  'PREVIEW_RESPONSE_INVALID',
  // adapter output/contract enums
  'recommended',
  'warning',
  // badge tone enums
  'positive',
  'neutral',
  'negative',
]);

const IGNORE_EXACT = new Set<string>([
  '@/components/autopilot/AutopilotShell',
  '../lib/autopilot/uiSpec',
  '../lib/autopilot/types',
  '../lib/validation/autopilot/preview',
  '../lib/formatCurrency',
  '/api/autopilot/preview',
  'POST',
  'include',
  'Content-Type',
  'application/json',
  'error',
  'code',
  'string',
  'number',
  'object',
  'category',
  'timing',
  'state',
  'impactSegments',
  'ok',
]);

function extractAllStringLiterals(src: string): string[] {
  const regex = /(['"`])((?:\\.|(?!\\1)[\\s\\S])*)\\1/g;
  return [...src.matchAll(regex)].map((m) => m[2] ?? '');
}

function isProbablyNonCopyToken(s: string): boolean {
  if (s.trim().length === 0) return true;
  if (/^\w+:\/\//.test(s)) return true;
  if (s.includes('/') && !s.includes(' ')) return true;
  if (s.includes('.') && !/\s/.test(s) && !/[.?!]$/.test(s)) return true;
  if (/^[a-z0-9_.-]+$/i.test(s) && !/^[A-Z][a-z]{2,}$/.test(s)) return true;
  return false;
}

function looksLikeUserFacingCopy(s: string): boolean {
  if (/\$\{/.test(s)) return true;
  if (/[.?!]/.test(s)) return true;
  if (/\s/.test(s)) return true;

  const uiVerbs = new Set([
    'Submit',
    'Continue',
    'Cancel',
    'Retry',
    'Close',
    'Save',
    'Done',
    'Back',
    'Next',
    'Skip',
    'Confirm',
    'Remove',
    'Edit',
    'View',
  ]);
  if (uiVerbs.has(s)) return true;
  if (/^[A-Z][a-z]{2,}$/.test(s)) return true;

  return false;
}

function looksLikeCssToken(s: string): boolean {
  return (
    s.includes('bg-[') ||
    s.includes('text-[') ||
    s.includes('rounded') ||
    s.includes('shadow') ||
    s.includes('px-') ||
    s.includes('py-') ||
    s.includes('mt-') ||
    s.includes('w-') ||
    s.includes('h-') ||
    s.includes('grid') ||
    s.includes('flex') ||
    s.includes('gap-') ||
    s.includes('border') ||
    s.includes('animate') ||
    s.includes('transition')
  );
}

function main(): void {
  const content = fs.readFileSync(runSimulationPath, 'utf8');
  const literals = extractAllStringLiterals(content);

  const copyViolations = new Set<string>();
  for (const lit of literals) {
    if (IGNORE_EXACT.has(lit)) continue;
    if (looksLikeCssToken(lit)) continue;
    if (/^@\/|^\.\//.test(lit)) continue;
    if (ALLOWED_OPS_LITERALS.has(lit)) continue;
    if (isProbablyNonCopyToken(lit)) continue;

    if (looksLikeUserFacingCopy(lit)) {
      copyViolations.add(lit);
    }
  }

  assert.deepEqual(
    [...copyViolations].sort(),
    [],
    [
      'runSimulation introduced user-facing copy literals (adapter must remain renderer-only).',
      'Move copy into engine-owned ui.* fields, or explicitly classify as protocol/ops.',
      'Copy-like literals detected:',
      ...[...copyViolations].sort().map((t) => `- ${JSON.stringify(t)}`),
    ].join('\n')
  );

  console.warn('autopilot-runsimulation-literals: ok');
}

main();
