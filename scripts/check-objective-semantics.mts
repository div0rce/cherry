#!/usr/bin/env node

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from './guardrails/lib/fail.mjs';

const ROOT = process.cwd();
const PREFIX = 'check:objective-semantics';
const FIX =
  'Convert reward points through rewardPointsToUtilityCents and keep objective math in objectiveUtilityCents.';

const SCAN_ROOTS = [
  path.join(ROOT, 'lib', 'engine', 'objective.ts'),
  path.join(ROOT, 'lib', 'engine', 'objective'),
  path.join(ROOT, 'lib', 'simulation'),
];

type Finding = {
  filePath: string;
  lineNumber: number;
  message: string;
};

function listFiles(entryPath: string): string[] {
  if (!fs.existsSync(entryPath)) return [];
  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    return /\.(?:ts|tsx|js|mjs)$/.test(entryPath) ? [entryPath] : [];
  }
  const results: string[] = [];
  for (const entry of fs.readdirSync(entryPath, { withFileTypes: true })) {
    const child = path.join(entryPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(child));
    } else if (entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(child)) {
      results.push(child);
    }
  }
  return results.sort();
}

function isAllowedDeprecatedPointConstant(filePath: string, line: string): boolean {
  if (
    filePath.endsWith(path.join('lib', 'engine', 'objective.ts')) &&
    line.trim() === 'POINTS_PER_DOLLAR,'
  ) {
    return true;
  }
  return (
    filePath.endsWith(path.join('lib', 'engine', 'objective', 'utility.ts')) &&
    (line.includes('POINTS_PER_DOLLAR') || line.includes('@deprecated'))
  );
}

function scanFile(filePath: string): Finding[] {
  const relPath = path.relative(ROOT, filePath);
  const text = fs.readFileSync(filePath, 'utf8');
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (
      line.includes('POINTS_PER_DOLLAR') &&
      !isAllowedDeprecatedPointConstant(filePath, line)
    ) {
      findings.push({
        filePath: relPath,
        lineNumber,
        message: 'POINTS_PER_DOLLAR is forbidden in live objective math',
      });
    }

    if (/rewardValueCents\s*\?\?\s*rewardPoints/.test(line)) {
      findings.push({
        filePath: relPath,
        lineNumber,
        message: 'raw reward points must not be a fallback objective value',
      });
    }

    if (
      (/\brewardPoints\b\s*[+\-*/]/.test(line) ||
        /[+\-*/]\s*\brewardPoints\b/.test(line)) &&
      !line.includes('rewardPointsToUtilityCents')
    ) {
      findings.push({
        filePath: relPath,
        lineNumber,
        message: 'reward points must be converted before objective arithmetic',
      });
    }
  });
  return findings;
}

const files = SCAN_ROOTS.flatMap(listFiles);
const findings = files.flatMap(scanFile);

if (findings.length > 0) {
  fail(PREFIX, 'Objective semantics guardrail failed', {
    details: findings.map(
      (finding) => `${finding.filePath}:${finding.lineNumber}:1: ${finding.message}`
    ),
    fix: FIX,
  });
}

process.stdout.write('check:objective-semantics: ok\n');
