import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const decisionPanelPath = path.resolve(
  __dirname,
  '../components/autopilot/AutopilotDecisionPanel.tsx'
);

/**
 * Guardrail intent:
 * - DecisionPanel must not introduce UI-authored copy.
 * - It may have classNames, imports, enum-ish strings, etc.
 * - It must not contain human-readable text nodes in JSX like: <div>Some sentence</div>.
 */

function extractJsxTextNodes(src: string): string[] {
  const results: string[] = [];

  // Heuristic: find text between tags that is not starting with "<" or "{"
  const regex = />\s*([^<{][\s\S]*?)\s*</g;

  for (const m of src.matchAll(regex)) {
    const raw = (m[1] ?? '').trim();
    if (!raw) continue;

    const normalized = raw.replace(/\s+/g, ' ').trim();
    if (normalized === '') continue;

    // Allow a single middot or similar trivial separator if ever present.
    if (normalized === '·') continue;

    results.push(normalized);
  }

  return results;
}

function main(): void {
  const content = fs.readFileSync(decisionPanelPath, 'utf8');
  const textNodes = extractJsxTextNodes(content);

  assert.deepEqual(
    textNodes,
    [],
    [
      'AutopilotDecisionPanel must not include JSX-visible literal copy.',
      'Move any new copy into uiSpec / engine payload and render it from props.',
      'Found these JSX text nodes:',
      ...textNodes.map((t) => `- ${t}`),
    ].join('\n')
  );

  console.warn('autopilot-decisionpanel-literals: ok');
}

main();
