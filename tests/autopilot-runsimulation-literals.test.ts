import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const runSimulationPath = path.resolve(__dirname, '../lib/autopilot/runSimulation.ts');

/**
 * Guardrail intent:
 * - runSimulation is AdapterSemantics v1; do not silently expand user-facing copy.
 * - Ignore imports, HTTP constants, classNames, and enum-ish/internal tokens.
 * - Fail when new human-readable literals appear outside the allowlist.
 */

const ALLOWED_SEMANTIC_LITERALS_V1 = new Set<string>([
  'Recommended',
  'Alternate card',
  'Use caution',
  'Your usual card',
  'Use ${primaryName} for this purchase.',
  'Any alternate card keeps your month similar.',
  'autopilot-recommendation',
  'alternate-card',
  'Strong rewards',
  'Good rewards',
  'Moderate rewards',
  'Low rewards',
  'Now',
  'Bucket used',
  'Bucket remaining',
  'Everything else',
  '${bucketName} used',
  '${bucketName} remaining',
  'Remaining after swipe: ${formatCurrency(preview.bucketImpact.remainingCents / 100)} in ${bucketLabel}.',
  'No bucket impact reported for this simulation.',
  'Estimated +${formatCurrency(preview.expectedBenefitCents / 100)} vs next best card.',
  "Use ${cards[0]?.name ?? 'your usual card'} for this purchase.",
  'This purchase may stress at least one bucket.',
  'Buckets stay balanced for this simulated swipe.',
  'Autopilot recommendation',
  'Other ways to pay',
  'Month impact',
  "Use ${cards[0]?.name ?? 'your usual card'} for this purchase",
  'View bucket impact',
  'Check bucket pressure before swiping.',
  'Safe, simulated only — no charges are made.',
  'Invalid simulation summary',
  'Unable to reach Autopilot preview endpoint',
  'Autopilot preview failed',
  'Autopilot returned an invalid response',
]);

const IGNORE_EXACT = new Set<string>([
  '@/components/autopilot/AutopilotShell',
  '@/lib/autopilot/uiSpec',
  '@/lib/autopilot/types',
  '@/lib/validation/autopilot/preview',
  '@/lib/formatCurrency',
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
  'recommended',
  'warning',
  'positive',
  'neutral',
  'negative',
  'bg-[#FECACA]',
  'bg-[#DCFCE7]',
  'bg-[#E2E8F0]',
  'bg-[#FEF3C7] text-[#92400E]',
  'h-2 w-2 rounded-full bg-[#F59E0B]',
  'bg-[#F0FDF4] text-[#15803D]',
  'h-2 w-2 rounded-full bg-[#22C55E]',
  '',
  ' ',
]);

function extractAllStringLiterals(src: string): string[] {
  const regex = /(['"`])((?:\\.|(?!\\1)[\\s\\S])*)\\1/g;
  return [...src.matchAll(regex)].map((m) => m[2] ?? '');
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

  const semanticCandidates: string[] = [];
  for (const lit of literals) {
    if (IGNORE_EXACT.has(lit)) continue;
    if (looksLikeCssToken(lit)) continue;
    if (/^@\/|^\.\//.test(lit)) continue;

    if (!ALLOWED_SEMANTIC_LITERALS_V1.has(lit)) {
      semanticCandidates.push(lit);
    }
  }

  assert.deepEqual(
    semanticCandidates,
    [],
    [
      'runSimulation introduced new string literals not covered by AdapterSemantics v1 allowlist.',
      'Either move semantics into the engine-owned UI bundle (v2), or expand the allowlist intentionally.',
      'New literals detected:',
      ...semanticCandidates.map((t) => `- ${JSON.stringify(t)}`),
    ].join('\n')
  );

  console.warn('autopilot-runsimulation-literals: ok');
}

main();
