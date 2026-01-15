import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const decisionPanelPath = path.resolve(
  __dirname,
  '../components/autopilot/AutopilotDecisionPanel.tsx'
);

/**
 * Guardrail intent:
 * - AutopilotDecisionPanel must be a renderer-only surface.
 * - No user-facing copy literals should live in the panel.
 * - Ignore imports, HTTP/constants, test ids, CSS/layout classNames, and protocol/ops tokens.
 * - Fail when human-readable literals appear.
 */

const ALLOWED_OPS_LITERALS = new Set<string>([
  // states / operational enums
  'idle',
  'loading',
  'error',
  'simulated',
  'recommended',
  'warning',

  // badge severity enums
  'positive',
  'neutral',
  'negative',

  // common internal ids / sentinels
  'autopilot-recommendation',
  'alternate-card',

  // common non-copy react/runtime tokens that may appear in components
  'button',
  'div',
  'span',
  'section',
  'article',
  'status',
  'message',
]);

const IGNORE_EXACT = new Set<string>([
  // common jsx keys / attributes / primitives
  'className',
  'children',
  'key',
  'id',
  'role',
  'type',
  'name',
  'value',
  'disabled',
  'checked',
  'selected',
  'placeholder',
  'title',
  'aria-label',
  'aria-describedby',
  'aria-hidden',
  'polite',
  'assertive',
  'data-testid',
  'data-test-id',
  'data-state',
  'data-slot',

  // types / misc
  'string',
  'number',
  'object',
  'undefined',
  'null',
  'true',
  'false',

  // common props passed through from ui bundle
  'ui',
  'panel',
  'badge',
  'severity',
  'label',
  'explanation',
  'formLabels',
  'rewardStrength',
  'sections',
  'ctas',
  'impact',
  'fallbackSegments',

  // if the file references routes/constants
  '/api/autopilot/preview',
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
    s.includes('pt-') ||
    s.includes('pb-') ||
    s.includes('pl-') ||
    s.includes('pr-') ||
    s.includes('mt-') ||
    s.includes('mb-') ||
    s.includes('ml-') ||
    s.includes('mr-') ||
    s.includes('w-') ||
    s.includes('h-') ||
    s.includes('min-') ||
    s.includes('max-') ||
    s.includes('grid') ||
    s.includes('flex') ||
    s.includes('gap-') ||
    s.includes('border') ||
    s.includes('ring') ||
    s.includes('outline') ||
    s.includes('animate') ||
    s.includes('transition') ||
    s.includes('duration-') ||
    s.includes('ease-')
  );
}

function isProbablyNonCopyToken(s: string): boolean {
  if (s.trim().length === 0) return true;

  // import-ish / module-ish
  if (/^@\/|^\.\//.test(s)) return true;

  // urls
  if (/^\w+:\/\//.test(s)) return true;

  // file-ish / route-ish segments
  if (s.includes('/') && !s.includes(' ')) return true;

  // dot-notation / identifiers
  if (s.includes('.') && !/\s/.test(s) && !/[.?!]$/.test(s)) return true;

  // pure identifier token (but do NOT swallow TitleCase single-word labels)
  if (/^[a-z0-9_.:-]+$/i.test(s) && !/^[A-Z][a-z]{2,}$/.test(s)) return true;

  return false;
}

function looksLikeUserFacingCopy(s: string): boolean {
  // templates are always copy
  if (/\$\{/.test(s)) return true;

  // punctuation/whitespace usually implies copy
  if (/[.?!]/.test(s)) return true;
  if (/\s/.test(s)) return true;

  // single-word UI labels (common “leaks”)
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
    'Apply',
    'Dismiss',
  ]);
  if (uiVerbs.has(s)) return true;

  // Title-case single word often indicates a label, but avoid common component/runtime words
  if (/^[A-Z][a-z]{2,}$/.test(s) && !ALLOWED_OPS_LITERALS.has(s)) return true;

  return false;
}

function main(): void {
  const content = fs.readFileSync(decisionPanelPath, 'utf8');
  const literals = extractAllStringLiterals(content);

  const copyViolations = new Set<string>();

  for (const lit of literals) {
    if (IGNORE_EXACT.has(lit)) continue;
    if (ALLOWED_OPS_LITERALS.has(lit)) continue;
    if (looksLikeCssToken(lit)) continue;
    if (isProbablyNonCopyToken(lit)) continue;

    if (looksLikeUserFacingCopy(lit)) {
      copyViolations.add(lit);
    }
  }

  assert.deepEqual(
    [...copyViolations].sort(),
    [],
    [
      'AutopilotDecisionPanel introduced user-facing copy literals (panel must remain renderer-only).',
      'Move copy into engine-owned preview.ui.* fields, or explicitly classify as protocol/ops.',
      'Copy-like literals detected:',
      ...[...copyViolations].sort().map((t) => `- ${JSON.stringify(t)}`),
    ].join('\n')
  );

  console.warn('autopilot-decisionpanel-literals: ok');
}

main();
