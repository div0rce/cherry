import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { classifyDocsDrift } from '../../lib/automation/classifiers/docs-drift.js';
import { classifyForbiddenChange } from '../../lib/automation/classifiers/forbidden-change.js';
import { classifyPrAutomation } from '../../lib/automation/classifiers/pr.js';
import { classifyPrRisk } from '../../lib/automation/classifiers/pr-risk.js';
import { classifySimulationDrift } from '../../lib/automation/classifiers/simulation-drift.js';
import {
  DOCS_DRIFT_CLASSIFIER_VERSION,
  FORBIDDEN_CHANGE_CLASSIFIER_VERSION,
  PR_AUTOMATION_CLASSIFIER_VERSION,
  PR_RISK_CLASSIFIER_VERSION,
  SIMULATION_DRIFT_CLASSIFIER_VERSION,
  type AutomationFileChange,
} from '../../lib/automation/classifiers/types.js';

const repoRoot = process.cwd();

function readFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...readFiles(full));
    } else if (entry.isFile() && /\.[cm]?ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function runVersionConstantTests(): void {
  assert.equal(PR_RISK_CLASSIFIER_VERSION, 'pr-risk@1');
  assert.equal(FORBIDDEN_CHANGE_CLASSIFIER_VERSION, 'forbidden-change@1');
  assert.equal(DOCS_DRIFT_CLASSIFIER_VERSION, 'docs-drift@1');
  assert.equal(SIMULATION_DRIFT_CLASSIFIER_VERSION, 'simulation-drift@1');
  assert.equal(
    PR_AUTOMATION_CLASSIFIER_VERSION,
    'pr-automation@1(pr-risk@1,forbidden-change@1,docs-drift@1)'
  );
  const automationSources = readFiles(path.join(repoRoot, 'lib', 'automation'));
  const globalVersionReferences = automationSources.filter((file) =>
    fs.readFileSync(file, 'utf8').includes('automation-classifiers-v1')
  );
  assert.deepEqual(globalVersionReferences, [], 'global automation classifier version is forbidden');
}

function runPrClassifierTests(): void {
  const files: AutomationFileChange[] = [
    {
      filename: 'lib/engine/solver.ts',
      status: 'modified',
      additions: 500,
      deletions: 400,
      patch: '+export const changed = true;',
    },
    {
      filename: 'prisma/schema.prisma',
      status: 'modified',
      additions: 10,
      deletions: 2,
    },
  ];
  const input = {
    repo: 'div0rce/cherry',
    sha: 'abc123',
    prNumber: 42,
    title: 'change engine solver',
    body: 'No issue link',
    labels: [],
    files,
  };
  const first = classifyPrAutomation(input);
  const second = classifyPrAutomation(input);
  assert.deepEqual(second, first);
  assert.equal(first.classifierVersion, PR_AUTOMATION_CLASSIFIER_VERSION);
  assert.equal(first.risk.classifierVersion, PR_RISK_CLASSIFIER_VERSION);
  assert.equal(
    first.forbiddenChange.classifierVersion,
    FORBIDDEN_CHANGE_CLASSIFIER_VERSION
  );
  assert.equal(first.docsDrift.classifierVersion, DOCS_DRIFT_CLASSIFIER_VERSION);
  assert.equal(Object.prototype.hasOwnProperty.call(first, 'outputHash'), false);
  assert.equal(first.risk.level, 'high');
  assert.equal(first.risk.statusRequest.state, 'failure');
  assert.equal(first.docsDrift.drift, true);

  const accepted = classifyPrRisk({ ...input, labels: ['risk-accepted'] });
  assert.equal(accepted.statusRequest.state, 'success');
}

function runForbiddenChangeTests(): void {
  const result = classifyForbiddenChange({
    files: [
      {
        filename: 'tests/foo.test.ts',
        status: 'modified',
        patch: '+it.skip(\"temporarily skips\", () => {});',
      },
      {
        filename: '.env.local',
        status: 'modified',
      },
    ],
  });
  assert.equal(result.forbidden, true);
  assert.deepEqual(result.labels, ['blocked-forbidden-change', 'needs-human-review']);
  assert.ok(result.violations.some((violation) => violation.startsWith('env_diff')));
  assert.ok(
    result.violations.some((violation) => violation.startsWith('skipped_test_added'))
  );
  assert.equal(result.statusRequest.state, 'failure');
  assert.equal(result.classifierVersion, FORBIDDEN_CHANGE_CLASSIFIER_VERSION);
}

function runDocsDriftTests(): void {
  const drift = classifyDocsDrift({
    files: [{ filename: 'app/api/scan/route.ts', status: 'modified' }],
  });
  assert.equal(drift.drift, true);
  assert.deepEqual(drift.domains, ['api']);
  assert.deepEqual(drift.labels, ['docs-drift', 'needs-human-review']);

  const clean = classifyDocsDrift({
    files: [
      { filename: 'app/api/scan/route.ts', status: 'modified' },
      { filename: 'docs/api/scan.md', status: 'modified' },
    ],
  });
  assert.equal(clean.drift, false);

  const engineUnrelatedMd = classifyDocsDrift({
    files: [
      { filename: 'lib/engine/solver.ts', status: 'modified' },
      { filename: 'docs/api/update.md', status: 'modified' },
    ],
  });
  assert.equal(engineUnrelatedMd.drift, true);

  const engineDocs = classifyDocsDrift({
    files: [
      { filename: 'lib/engine/solver.ts', status: 'modified' },
      { filename: 'docs/engine/update.md', status: 'modified' },
    ],
  });
  assert.equal(engineDocs.drift, false);

  const apiWrongDocs = classifyDocsDrift({
    files: [
      { filename: 'app/api/scan/route.ts', status: 'modified' },
      { filename: 'docs/engine/update.md', status: 'modified' },
    ],
  });
  assert.equal(apiWrongDocs.drift, true);

  const schemaDocs = classifyDocsDrift({
    files: [
      { filename: 'prisma/schema.prisma', status: 'modified' },
      { filename: 'docs/database/prisma.md', status: 'modified' },
    ],
  });
  assert.equal(schemaDocs.drift, false);

  const schemaReadmeOnly = classifyDocsDrift({
    files: [
      { filename: 'prisma/schema.prisma', status: 'modified' },
      { filename: 'README.md', status: 'modified' },
    ],
  });
  assert.equal(schemaReadmeOnly.drift, true);

  const multiDomainPartialDocs = classifyDocsDrift({
    files: [
      { filename: 'lib/engine/solver.ts', status: 'modified' },
      { filename: 'app/api/scan/route.ts', status: 'modified' },
      { filename: 'docs/engine/update.md', status: 'modified' },
    ],
  });
  assert.equal(multiDomainPartialDocs.drift, true);
  assert.deepEqual(multiDomainPartialDocs.domains, ['engine', 'api']);

  const multiDomainCompleteDocs = classifyDocsDrift({
    files: [
      { filename: 'lib/engine/solver.ts', status: 'modified' },
      { filename: 'app/api/scan/route.ts', status: 'modified' },
      { filename: 'docs/engine/update.md', status: 'modified' },
      { filename: 'docs/api/scan.md', status: 'modified' },
    ],
  });
  assert.equal(multiDomainCompleteDocs.drift, false);
  assert.equal(drift.classifierVersion, DOCS_DRIFT_CLASSIFIER_VERSION);
}

function runSimulationDriftTests(): void {
  const result = classifySimulationDrift(
    {
      score: 90,
      allocation: { cardA: 10_000 },
      strategy: 'pay_minimum',
      runwayDays: 30,
      viableCandidateCount: 2,
    },
    {
      score: 70,
      allocation: { cardA: 1_000 },
      strategy: 'pay_aggressive',
      runwayDays: 5,
      viableCandidateCount: 0,
    }
  );
  assert.equal(result.drift, true);
  assert.ok(result.reasons.includes('strategy_flip'));
  assert.ok(result.reasons.includes('runway_collapse'));
  assert.ok(result.reasons.includes('empty_viable_candidates'));
  assert.equal(result.classifierVersion, SIMULATION_DRIFT_CLASSIFIER_VERSION);
}

function runBranchProtectionDocsTest(): void {
  const docPath = path.join(repoRoot, 'docs', 'automation', 'branch-protection.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  for (const context of [
    'cherry/forbidden-change',
    'cherry/docs-drift',
    'cherry/risk-gate',
    'cherry/openclaw-policy',
  ]) {
    assert.ok(doc.includes(context), `branch protection docs must list ${context}`);
  }
  assert.ok(
    doc.includes('Without branch protection, Cherry statuses are advisory only.'),
    'branch protection docs must state advisory-only behavior without branch protection'
  );
}

runVersionConstantTests();
runPrClassifierTests();
runForbiddenChangeTests();
runDocsDriftTests();
runSimulationDriftTests();
runBranchProtectionDocsTest();
console.warn('automation classifiers: ok');
