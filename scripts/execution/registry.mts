export const EXECUTION_RUNNER = 'scripts/execution/run.mts' as const;
export const EXECUTION_DB_RUNNER = 'scripts/execution/run-db.mts' as const;

export const EXECUTION = {
  'check:clean': 'scripts/assert-clean-tree.mts',
  'check:db-ready': 'scripts/db-ready.mts',
  'check:dev-login': 'scripts/dev-login.mts',
  'check:db:optional': 'scripts/db-check-optional.mts',
  'check:db:required': 'scripts/db-check-required.mts',
  'check:run-tests': 'scripts/run-tests.mts',
  'check:tailwind-conflicts': 'scripts/tailwind-conflicts.mts',
  'ingest:moustafa-bank': 'scripts/ingest-moustafa-bank-csv.mts',
  'audit:evaluator:moustafa': 'scripts/run-offline-evaluator-moustafa.mts',
  'backfill:seed-demo': 'scripts/seed-demo.mts',
  'ingest:mcc': 'scripts/ingest-mcc.mts',
  'audit:integrity': 'scripts/audit-integrity.mts',
  'backfill:bucket-last-reset-at': 'scripts/backfill_bucket_last_reset_at.mts',
  'backfill:category-preference-enum': 'scripts/backfill_category_preference_enum.mts',
  'cleanup:vine-sessions': 'scripts/cleanup_expired_vine_sessions.mts',
  'cleanup:kill-alias-imports': 'scripts/codemod-kill-alias-imports.mts',
  'report:authority': 'scripts/authority-coverage.mts',
  'report:bucket-balance': 'scripts/debug-bucket-balance.mts',
} as const;

export type ExecutionName = keyof typeof EXECUTION;
export type ExecutionPath = (typeof EXECUTION)[ExecutionName];
export const EXECUTION_NAMES = Object.keys(EXECUTION) as ExecutionName[];
export const EXECUTION_DB_NAMES = [
  'check:db-ready',
  'check:db:optional',
  'check:db:required',
  'check:run-db-tests',
] as const;
export type ExecutionDbName = (typeof EXECUTION_DB_NAMES)[number];
