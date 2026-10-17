import * as assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Contract under test:
//  1. check:side-effects treats Date.now(), new Date() and new Date(...spread) as clock reads
//     ("time") and does NOT treat new Date(value) conversions as side effects.
//  2. check:side-effects:diff evaluates legacy-combo expiry against the HEAD commit date, so a
//     commit dated after expiresBy fails and a remediated allowlist passes on a later commit.

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..', '..');
const fixtureRoot = path.join(repoRoot, 'tests', 'fixtures', 'guardrails', 'repo', 'side-effects');
const CLOCK_FIXTURES = ['clock-new-date.ts', 'clock-now.ts', 'clock-spread.ts'] as const;

function runGuardrail(name: string, root: string): { status: number | null; output: string } {
  const env: NodeJS.ProcessEnv = { ...process.env };
  // Epoch overrides take precedence over the HEAD commit date; the expiry cases below need HEAD.
  delete env['SOURCE_DATE_EPOCH'];
  delete env['CHERRY_GUARDRAIL_EPOCH'];
  const result = spawnSync('npm', ['run', name, '--', '--root', root], {
    cwd: repoRoot,
    encoding: 'utf8',
    env,
  });
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

// 1. Detection precision (static fixture; conversion.ts is deliberately not allowlisted).
{
  const { status, output } = runGuardrail('check:side-effects', fixtureRoot);
  assert.equal(status, 0, `expected fixture to pass (conversions are not side effects), got: ${output}`);
  for (const file of CLOCK_FIXTURES) {
    assert.equal(output.includes(`lib/${file}: allowlisted legacy side effects (time)`), true, output);
  }

  // Each clock-read syntax must fail on its own when it is not allowlisted.
  for (const file of CLOCK_FIXTURES) {
    const unlisted = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-side-effects-unlisted-'));
    try {
      fs.mkdirSync(path.join(unlisted, 'lib'));
      fs.mkdirSync(path.join(unlisted, 'scripts'));
      fs.copyFileSync(path.join(fixtureRoot, 'lib', file), path.join(unlisted, 'lib', file));
      fs.writeFileSync(path.join(unlisted, 'scripts', 'side-effects.allowlist.json'), '{}\n');
      const missing = runGuardrail('check:side-effects', unlisted);
      assert.notEqual(missing.status, 0, `expected an unlisted clock read in ${file} to fail`);
      assert.equal(missing.output.includes(`lib/${file}: time`), true, missing.output);
    } finally {
      fs.rmSync(unlisted, { recursive: true, force: true });
    }
  }
}

// 2. Expiry against HEAD commit date, in a throwaway git repo.
{
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-side-effects-diff-'));
  const git = (args: string[], date: string): void => {
    const result = spawnSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'fixture',
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: 'fixture',
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
        GIT_AUTHOR_DATE: date,
        GIT_COMMITTER_DATE: date,
      },
    });
    assert.equal(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr}`);
  };
  const allowlistPath = path.join(repo, 'scripts', 'side-effects.allowlist.json');
  const write = (entries: unknown): void => {
    fs.mkdirSync(path.dirname(allowlistPath), { recursive: true });
    fs.writeFileSync(allowlistPath, `${JSON.stringify(entries, null, 2)}\n`);
  };
  const combo = {
    'lib/legacy.ts': { effects: ['prisma', 'time'], source: 'legacy', tier: 'legacy-combo', expiresBy: '2026-06-01' },
  };
  try {
    git(['init', '-q'], '2026-01-01T00:00:00Z');
    write(combo);
    git(['add', '.'], '2026-01-01T00:00:00Z');
    git(['commit', '-q', '-m', 'baseline'], '2026-01-01T00:00:00Z');
    git(['commit', '-q', '--allow-empty', '-m', 'still before expiry'], '2026-05-31T12:00:00Z');
    const before = runGuardrail('check:side-effects:diff', repo);
    assert.equal(before.status, 0, `expected pass before expiry, got: ${before.output}`);

    git(['commit', '-q', '--allow-empty', '-m', 'after expiry'], '2026-07-01T12:00:00Z');
    const expired = runGuardrail('check:side-effects:diff', repo);
    assert.notEqual(expired.status, 0, 'expected failure for a commit dated after expiresBy');
    assert.equal(expired.output.includes('Legacy-combo entry expired (2026-06-01): lib/legacy.ts'), true, expired.output);

    // Remediation: the clock read is gone, the entry drops to persistence-only.
    write({ 'lib/legacy.ts': { effects: ['prisma'], source: 'legacy', tier: 'persistence-only' } });
    git(['commit', '-q', '-am', 'remediate'], '2026-09-22T12:00:00Z');
    const remediated = runGuardrail('check:side-effects:diff', repo);
    // The diff rule also demands a net reduction in legacy entries when the allowlist changes.
    assert.notEqual(remediated.status, 0, 'tier change alone must not satisfy the reduction rule');
    assert.equal(remediated.output.includes('Allowlist changes must reduce legacy entries'), true, remediated.output);

    write({});
    git(['commit', '-q', '-am', 'remove legacy entry'], '2026-09-23T12:00:00Z');
    const reduced = runGuardrail('check:side-effects:diff', repo);
    assert.equal(reduced.status, 0, `expected pass after reducing legacy entries, got: ${reduced.output}`);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
}

process.stdout.write('side-effects-time-detection: ok\n');
