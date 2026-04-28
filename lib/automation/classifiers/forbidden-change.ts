import type { AutomationStatusRequest, PrClassifierInput } from './types.js';
import { FORBIDDEN_CHANGE_CLASSIFIER_VERSION } from './types.js';

export type ForbiddenChangeClassification = {
  classifierVersion: typeof FORBIDDEN_CHANGE_CLASSIFIER_VERSION;
  forbidden: boolean;
  violations: string[];
  labels: string[];
  statusRequest: AutomationStatusRequest;
};

export function classifyForbiddenChange(
  input: Pick<PrClassifierInput, 'files'>
): ForbiddenChangeClassification {
  const violations: string[] = [];

  for (const file of input.files) {
    const name = file.filename;
    const patch = file.patch ?? '';
    if (
      name === '.env' ||
      name === '.env.local' ||
      name.endsWith('/.env') ||
      name.endsWith('/.env.local')
    ) {
      violations.push(`env_diff:${name}`);
    }
    if (/secret|credentials|production.*db/i.test(name)) {
      violations.push(`sensitive_path:${name}`);
    }
    if (file.status === 'removed' && /(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\./.test(name)) {
      violations.push(`deleted_test:${name}`);
    }
    if (/^[+].*\b(test|describe|it)\.skip\b/m.test(patch)) {
      violations.push(`skipped_test_added:${name}`);
    }
    if (/^[+].*console\.log\(/m.test(patch)) {
      violations.push(`console_log_added:${name}`);
    }
    if (/^[+].*TODO(?!.*#\d+)/im.test(patch)) {
      violations.push(`todo_without_issue:${name}`);
    }
    if (/^[+].*from ['"]@prisma\/client['"]/m.test(patch) && /lib\/engine|lib\/authority/.test(name)) {
      violations.push(`forbidden_prisma_import:${name}`);
    }
    if (/^[+].*(DATABASE_URL|PRODUCTION_DATABASE_URL|direct prod mutation)/im.test(patch)) {
      violations.push(`production_truth_mutation_hint:${name}`);
    }
  }

  const forbidden = violations.length > 0;
  return {
    classifierVersion: FORBIDDEN_CHANGE_CLASSIFIER_VERSION,
    forbidden,
    violations,
    labels: forbidden ? ['blocked-forbidden-change', 'needs-human-review'] : [],
    statusRequest: {
      context: 'cherry/forbidden-change',
      state: forbidden ? 'failure' : 'success',
      description: forbidden
        ? `${violations.length} forbidden change pattern(s) detected.`
        : 'No forbidden change patterns detected.',
    },
  };
}
