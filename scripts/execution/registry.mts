export const EXECUTION_RUNNER = 'scripts/execution/run.mts' as const;

export const EXECUTION = {
  'check:clean': 'scripts/assert-clean-tree.mjs',
  'check:db-ready': 'scripts/db-ready.mts',
  'check:run-tests': 'scripts/run-tests.mjs',
  'check:tailwind-conflicts': 'scripts/tailwind-conflicts.mts',
  'ingest:moustafa-bank': 'scripts/ingest-moustafa-bank-csv.mts',
  'audit:evaluator:moustafa': 'scripts/run-offline-evaluator-moustafa.mts',
  'backfill:seed-demo': 'scripts/seed-demo.mts',
  'ingest:mcc': 'scripts/ingest-mcc.mts',
  'audit:integrity': 'scripts/audit-integrity.mts',
  'backfill:category-preference-enum': 'scripts/backfill_category_preference_enum.mts',
  'cleanup:vine-sessions': 'scripts/cleanup_expired_vine_sessions.mts',
  'report:authority': 'scripts/authority-coverage.mts',
} as const;

export type ExecutionName = keyof typeof EXECUTION;
export type ExecutionPath = (typeof EXECUTION)[ExecutionName];
export const EXECUTION_NAMES = Object.keys(EXECUTION) as ExecutionName[];
