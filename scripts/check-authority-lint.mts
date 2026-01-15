import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { ensureTsEsm } from './lib/ensure-ts-esm.mjs';
import { asMessage } from './guardrails/lib/error.mjs';
import { fail } from './guardrails/lib/fail.mjs';

ensureTsEsm();


const PREFIX = 'check:authority-lint';
const FIX = 'Remove forbidden authority wording or add the required freeze banner.';
const forbiddenTokens = ['approve', 'decline', 'block', 'route', 'authorization', 'auth loop'];
const scopedGlobs = ['lib/authority/**/*.ts', 'lib/autopilot/**/*.ts', 'lib/vine/**/*.ts', 'app/api/**/*.ts'];
const ignoreGlobs = [
  '**/docs/**',
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/*.test.*',
  '**/*.spec.*',
];
const freezeFiles = [
  'lib/authority/simulateSpendAuthority.ts',
  'lib/authority/reasonCodes.ts',
  'lib/authority/config.ts',
  'lib/authority/replayAuthority.ts',
];
const freezeBanner = '// authority_v1 — frozen. Any semantic change requires authority_v2.';

function stripComments(content: string): string {
  const withoutBlock = content.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutBlock
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

function checkTokens(): Array<{ file: string; token: string }> {
  const files = fg.sync(scopedGlobs, { ignore: ignoreGlobs, dot: false });
  const violations: Array<{ file: string; token: string }> = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const scanned = stripComments(content);
    for (const token of forbiddenTokens) {
      const pattern = token.replace(/\s+/, '\\s+');
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(scanned)) {
        violations.push({ file, token });
      }
    }
  }
  return violations;
}

function checkFreezeBanners(): string[] {
  const violations: string[] = [];
  for (const file of freezeFiles) {
    const abs = path.join(process.cwd(), file);
    const content = fs.readFileSync(abs, 'utf8');
    const firstLine = content.split('\n').find((line) => line.trim().length > 0) ?? '';
    if (firstLine.trim() !== freezeBanner) {
      violations.push(file);
    }
  }
  return violations;
}

function main(): void {
  const tokenViolations = checkTokens();
  const bannerViolations = checkFreezeBanners();

  if (tokenViolations.length > 0 || bannerViolations.length > 0) {
    const details = [
      ...tokenViolations.map(
        (violation) => `${violation.file}:1:1: contains \"${violation.token}\"`
      ),
      ...bannerViolations.map(
        (file) => `${file}:1:1: missing authority_v1 freeze banner`
      ),
    ];
    fail(PREFIX, 'Authority lint violations detected', { details, fix: FIX });
  }
}

try {
  main();
} catch (error: unknown) {
  const message = asMessage(error);
  fail(PREFIX, `Guardrail crashed: ${message}`, { fix: FIX });
}
