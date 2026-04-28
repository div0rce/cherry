import type { AutomationStatusRequest, PrClassifierInput } from './types.js';
import { PR_RISK_CLASSIFIER_VERSION } from './types.js';

export type PrRiskClassification = {
  classifierVersion: typeof PR_RISK_CLASSIFIER_VERSION;
  score: number;
  level: 'low' | 'medium' | 'high';
  labels: string[];
  reasons: string[];
  accepted: boolean;
  statusRequest: AutomationStatusRequest;
};

function hasLinkedIssue(input: PrClassifierInput): boolean {
  const text = `${input.title} ${input.body}`;
  return /(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#\d+|#\d+/i.test(text);
}

export function classifyPrRisk(input: PrClassifierInput): PrRiskClassification {
  const names = input.files.map((file) => file.filename);
  const additions = input.files.reduce((sum, file) => sum + (file.additions ?? 0), 0);
  const deletions = input.files.reduce((sum, file) => sum + (file.deletions ?? 0), 0);
  const changedLines = additions + deletions;

  const hasEngine = names.some(
    (name) =>
      name.startsWith('lib/engine') ||
      name === 'lib/engine.ts' ||
      name.includes('/engine/')
  );
  const hasPrisma = names.some(
    (name) => name === 'prisma/schema.prisma' || name.startsWith('prisma/migrations/')
  );
  const hasApi = names.some((name) => name.startsWith('app/api/'));
  const testDeleted = input.files.some(
    (file) =>
      file.status === 'removed' &&
      /(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\./.test(file.filename)
  );
  const docsOnly =
    names.length > 0 &&
    names.every(
      (name) => name.startsWith('docs/') || name === 'README.md' || name.endsWith('.md')
    );
  const largeDiff = changedLines > 800 || names.length > 25;
  const noLinkedIssue = hasLinkedIssue(input) === false;

  let score = 0;
  const reasons: string[] = [];
  if (hasEngine) {
    score += 5;
    reasons.push('engine files changed +5');
  }
  if (hasPrisma) {
    score += 4;
    reasons.push('Prisma schema or migrations changed +4');
  }
  if (hasApi) {
    score += 3;
    reasons.push('API route changed +3');
  }
  if (testDeleted) {
    score += 5;
    reasons.push('test deleted +5');
  }
  if (docsOnly) {
    score -= 3;
    reasons.push('docs only -3');
  }
  if (largeDiff) {
    score += 2;
    reasons.push('large diff +2');
  }
  if (noLinkedIssue) {
    score += 2;
    reasons.push('no linked issue +2');
  }

  const level = score >= 8 ? 'high' : score >= 4 ? 'medium' : 'low';
  const accepted = input.labels.includes('risk-accepted');
  const labels = level === 'high' ? ['risk-high'] : level === 'medium' ? ['risk-medium'] : ['risk-low'];
  if (level === 'high') labels.push('needs-human-review');
  if (hasEngine) labels.push('engine-change');
  if (docsOnly) labels.push('docs-only');

  const state = level === 'high' && accepted === false ? 'failure' : 'success';
  const description =
    state === 'failure'
      ? `High-risk PR score ${score}; add risk-accepted only after review.`
      : `PR risk ${level} with score ${score}.`;

  return {
    classifierVersion: PR_RISK_CLASSIFIER_VERSION,
    score,
    level,
    labels,
    reasons,
    accepted,
    statusRequest: {
      context: 'cherry/risk-gate',
      state,
      description,
    },
  };
}
