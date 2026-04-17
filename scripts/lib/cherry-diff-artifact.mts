import * as fs from 'node:fs';
import * as path from 'node:path';
import { fail } from '../guardrails/lib/fail.mjs';
import { runTool } from '../guardrails/lib/run-tool.mjs';

export const ROOT = process.cwd();
export const PATCH_NAME = 'cherry-diff.patch';
export const PATCH_PATH = path.join(ROOT, PATCH_NAME);
export const GENERIC_ARTIFACT_PREFIX = 'verify:cherry-diff-artifact';

type ToolResult = ReturnType<typeof runTool>;

export function assertOk(prefix: string, step: string, result: ToolResult, fix: string): void {
  if (result.exitCode === 0) return;
  const details = [`step=${step}`, `exit=${result.exitCode}`];
  if (result.stdout.trim().length > 0) {
    details.push(`stdout=${result.stdout.trim()}`);
  }
  if (result.stderr.trim().length > 0) {
    details.push(`stderr=${result.stderr.trim()}`);
  }
  fail(prefix, `Failed during ${step}.`, { details, fix });
}

export function ensurePatchExists(prefix: string, fix: string): void {
  if (!fs.existsSync(PATCH_PATH)) {
    fail(prefix, `${PATCH_NAME} is missing.`, { fix });
  }
}

export function collectExpectedChangedFiles(prefix: string): string[] {
  const tracked = runTool(
    'git',
    ['diff', '--name-only', '--find-renames', 'HEAD', '--', '.', ':(exclude)cherry-diff.patch'],
    { cwd: ROOT }
  );
  assertOk(
    prefix,
    'git diff --name-only HEAD',
    tracked,
    'Ensure the repository is a git checkout with HEAD available before verifying the full current delta relative to HEAD.'
  );

  const untracked = runTool('git', ['ls-files', '--others', '--exclude-standard'], { cwd: ROOT });
  assertOk(
    prefix,
    'git ls-files --others --exclude-standard',
    untracked,
    'Ensure git can enumerate non-ignored untracked files before verifying the full current delta relative to HEAD.'
  );

  const files = new Set<string>();
  for (const line of tracked.stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed !== PATCH_NAME) {
      files.add(trimmed);
    }
  }
  for (const line of untracked.stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed !== PATCH_NAME) {
      files.add(trimmed);
    }
  }
  return [...files].sort();
}

export function collectPatchManifest(prefix: string): Set<string> {
  ensurePatchExists(prefix, 'Generate cherry-diff.patch before running artifact verification.');
  const patchText = fs.readFileSync(PATCH_PATH, 'utf8');
  const paths = new Set<string>();
  const diffHeader = /^diff --git a\/(.+?) b\/(.+)$/gm;
  for (const match of patchText.matchAll(diffHeader)) {
    const left = match[1];
    const right = match[2];
    if (left !== undefined && left !== PATCH_NAME) {
      paths.add(left);
    }
    if (right !== undefined && right !== PATCH_NAME) {
      paths.add(right);
    }
  }
  return paths;
}

export function assertPatchManifest(prefix: string): void {
  const expected = collectExpectedChangedFiles(prefix);
  const patchManifest = collectPatchManifest(prefix);
  const missing = expected.filter((file) => !patchManifest.has(file));

  if (missing.length > 0) {
    fail(prefix, 'Patch manifest is missing files from the full current worktree delta relative to HEAD.', {
      details: missing,
      fix: 'Regenerate cherry-diff.patch from the full current worktree before verifying the artifact.',
    });
  }
}

export function verifyCherryDiffArtifact(prefix = GENERIC_ARTIFACT_PREFIX): void {
  ensurePatchExists(prefix, 'Run npm run generate:cherry-diff before verifying the cherry-diff artifact.');
  assertPatchManifest(prefix);
}
