import type { AutomationStatusRequest, PrClassifierInput } from './types.js';
import { DOCS_DRIFT_CLASSIFIER_VERSION } from './types.js';

export type DocsDriftClassification = {
  classifierVersion: typeof DOCS_DRIFT_CLASSIFIER_VERSION;
  drift: boolean;
  domains: string[];
  labels: string[];
  statusRequest: AutomationStatusRequest;
};

export function classifyDocsDrift(
  input: Pick<PrClassifierInput, 'files'>
): DocsDriftClassification {
  const names = input.files.map((file) => file.filename);
  const domains: string[] = [];

  if (names.some((name) => name.startsWith('lib/engine') || name === 'lib/engine.ts' || name.startsWith('lib/authority'))) {
    domains.push('engine');
  }
  if (names.some((name) => name.startsWith('app/api/'))) {
    domains.push('api');
  }
  if (names.some((name) => name === 'prisma/schema.prisma' || name.startsWith('prisma/migrations/'))) {
    domains.push('schema');
  }
  if (names.some((name) => name.includes('env') || name === '.env.example')) {
    domains.push('env');
  }
  if (names.some((name) => /(^|\/)(tests?|__tests__)(\/|$)|\.(test|spec)\./.test(name))) {
    domains.push('tests');
  }
  if (
    names.some(
      (name) =>
        name.startsWith('lib/automation/') ||
        name.startsWith('app/api/automation/') ||
        name.startsWith('cherry-n8n-workflows/')
    )
  ) {
    domains.push('automation');
  }

  const uniqueDomains = [...new Set(domains)];
  const docsByDomain: Record<string, (name: string) => boolean> = {
    engine: (name) =>
      name.startsWith('docs/architecture/') ||
      name.startsWith('docs/engine/') ||
      name === 'README.md',
    api: (name) => name.startsWith('docs/api/') || name === 'README.md',
    schema: (name) =>
      name.startsWith('docs/schema/') ||
      name === 'prisma/README.md' ||
      name.startsWith('docs/database/'),
    env: (name) =>
      name === '.env.example' || name.startsWith('docs/env/') || name === 'README.md',
    tests: (name) => name.startsWith('docs/testing/') || name === 'README.md',
    automation: (name) => name.startsWith('docs/automation/') || name === 'README.md',
  };
  const missingDocs = uniqueDomains.filter((domain) => {
    const matches = docsByDomain[domain];
    return matches === undefined || names.some(matches) === false;
  });
  const drift = missingDocs.length > 0;

  return {
    classifierVersion: DOCS_DRIFT_CLASSIFIER_VERSION,
    drift,
    domains: uniqueDomains,
    labels: drift ? ['docs-drift', 'needs-human-review'] : [],
    statusRequest: {
      context: 'cherry/docs-drift',
      state: drift ? 'failure' : 'success',
      description: drift
        ? `Docs update required for ${domains.join(', ')} changes.`
        : 'No docs drift detected.',
    },
  };
}
