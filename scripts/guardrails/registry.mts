export const GUARDRAIL_ENTRYPOINT = 'check:guardrails' as const;

const SCRIPT_ROOT = 'scripts' as const;
const CHECK_PREFIX = 'check-' as const;
const CHECK_PATH_BASE = `${SCRIPT_ROOT}/${CHECK_PREFIX}` as const;
const CATCH_UNKNOWN_PATH = `${CHECK_PATH_BASE}catch-unknown.mts` as const;
const ESM_LOADER_TOTALITY_PATH = `${CHECK_PATH_BASE}esm-loader-totality.mts` as const;
const NO_SCRIPT_ALIAS_IMPORTS_PATH = `${CHECK_PATH_BASE}no-script-alias-imports.mts` as const;
const NO_TS_EXTENSION_IMPORTS_PATH = `${CHECK_PATH_BASE}no-ts-extension-imports.mts` as const;
const ESM_IMPORTS_PATH = `${CHECK_PATH_BASE}esm-imports.mts` as const;
const TYPE_ONLY_IMPORTS_PATH = `${CHECK_PATH_BASE}type-only-imports.mts` as const;
const PRISMA_MOCK_LOADER_TOTALITY_PATH = `${CHECK_PATH_BASE}prisma-mock-loader-totality.mts` as const;
const SCRIPT_RUNNER_CONTRACT_PATH = `${CHECK_PATH_BASE}script-runner-contract.mts` as const;
const SCRIPT_RUNTIME_BOUNDARY_PATH = `${CHECK_PATH_BASE}script-runtime-boundary.mts` as const;
const TS_COVERAGE_PATH = `${CHECK_PATH_BASE}ts-coverage.mts` as const;
const CHECK_CONTRACT_PATH = `${CHECK_PATH_BASE}check-contract.mts` as const;
const LOCKFILE_SYNC_PATH = `${CHECK_PATH_BASE}lockfile-sync.mts` as const;
const LOCKFILE_INTEGRITY_PATH = `${CHECK_PATH_BASE}lockfile-integrity.mts` as const;
const PACKAGE_MANAGER_PIN_PATH = `${CHECK_PATH_BASE}package-manager-pin.mts` as const;
const CI_USES_NPM_CI_PATH = `${CHECK_PATH_BASE}ci-uses-npm-ci.mts` as const;
const FUNCTION_SIZE_BUDGET_PATH = `${CHECK_PATH_BASE}function-size-budget.mts` as const;
const NO_VENDOR_SHIMS_PATH = `${CHECK_PATH_BASE}no-vendor-shims.mts` as const;
const GUARDRAIL_NO_RUNTIME_IO_PATH = `${CHECK_PATH_BASE}guardrail-no-runtime-io.mts` as const;
const GUARDRAIL_HELPERS_EXCLUSIVE_PATH = `${CHECK_PATH_BASE}guardrail-helpers-exclusive.mts` as const;
const GUARDRAIL_SUBPROCESS_TOTALITY_PATH =
  `${CHECK_PATH_BASE}guardrail-subprocess-totality.mts` as const;
const DB_TRUTH_BOUNDARY_PATH = `${CHECK_PATH_BASE}db-truth-boundary.mts` as const;
const DB_RUNNER_EXCLUSIVITY_PATH = `${CHECK_PATH_BASE}db-runner-exclusivity.mts` as const;
const DB_CONSTRAINT_COVERAGE_PATH = `${CHECK_PATH_BASE}db-constraint-coverage.mts` as const;
const DB_CONSTRAINT_NAMING_PATH = `${CHECK_PATH_BASE}db-constraint-naming.mts` as const;
const DB_SEMANTIC_ORM_AGNOSTIC_PATH = `${CHECK_PATH_BASE}db-semantic-orm-agnostic.mts` as const;
const DB_SEMANTIC_SUITE_MINIMUM_PATH = `${CHECK_PATH_BASE}db-semantic-suite-minimum.mts` as const;
const DB_LEDGER_ENTRYPOINTS_PATH = `${CHECK_PATH_BASE}db-ledger-entrypoints.mts` as const;
const DB_ACCOUNTING_REPLAY_PATH = `${CHECK_PATH_BASE}db-accounting-replay.mts` as const;
const ACCOUNTING_INVARIANTS_PATH = `${CHECK_PATH_BASE}accounting-invariants.mts` as const;
const ACCOUNTING_PROOF_COVERAGE_PATH = `${CHECK_PATH_BASE}accounting-proof-coverage.mts` as const;
const REPLAY_EQUALS_MATERIALIZED_PATH =
  `${CHECK_PATH_BASE}replay-equals-materialized.mts` as const;
const NO_MUTATION_PATH = `${CHECK_PATH_BASE}no-mutation.mts` as const;
const CONFIG_SNAPSHOT_PATH = `${CHECK_PATH_BASE}config-snapshot.mts` as const;
const ENGINE_OPTIMALITY_PATH = `${CHECK_PATH_BASE}engine-optimality.mts` as const;
const ENGINE_OPTIMALITY_VERSION_PATH = `${CHECK_PATH_BASE}engine-optimality-version.mts` as const;
const ENGINE_INPUT_BOUNDARY_PATH = `${CHECK_PATH_BASE}engine-input-boundary.mts` as const;
const REPLAY_STAGING_EMPTY_PATH = `${CHECK_PATH_BASE}replay-staging-empty.mts` as const;
const REPLAY_OBJECT_STORE_PATH = `${CHECK_PATH_BASE}replay-object-store.mts` as const;
const ENV_CONTRACT_PATH = `${CHECK_PATH_BASE}env-contract.mts` as const;
const NO_LOCAL_ENV_FILES_PATH = `${CHECK_PATH_BASE}no-local-env-files.mts` as const;
const TMP_ROOT_SAFETY_PATH = `${CHECK_PATH_BASE}tmp-root-safety.mts` as const;
const TEMP_QUOTA_PATH = `${CHECK_PATH_BASE}temp-quota.mts` as const;
const TMP_ROOT_SHAPE_PATH = `${CHECK_PATH_BASE}tmp-root-shape.mts` as const;
const ARTIFACT_SIZE_BUDGETS_PATH = `${CHECK_PATH_BASE}artifact-size-budgets.mts` as const;
const VERCEL_PARITY_PATH = `${CHECK_PATH_BASE}vercel-parity.mts` as const;
const ENGINE_VERSION_GATES_PATH = `${CHECK_PATH_BASE}engine-version-gates.mts` as const;
const ENGINE_VERSION_BUMP_PATH = `${CHECK_PATH_BASE}engine-version-bump.mts` as const;
const ENGINE_VERSION_IMPORTS_PATH = `${CHECK_PATH_BASE}engine-version-imports.mts` as const;
const SCHEMA_EVOLUTION_PATH = `${CHECK_PATH_BASE}schema-evolution.mts` as const;
const SCHEMA_BREAKING_PLAN_PATH = `${CHECK_PATH_BASE}schema-breaking-plan.mts` as const;
const AGENTS_DOCTRINE_LINK_PATH = `${CHECK_PATH_BASE}agents-doctrine-link.mts` as const;
const DOCTRINE_PRESENT_PATH = `${CHECK_PATH_BASE}doctrine-present.mts` as const;
const CHANGE_ISOLATION_PATH = `${CHECK_PATH_BASE}change-isolation.mts` as const;
const ENVIRONMENT_IMPORT_INTEGRITY_PATH =
  `${CHECK_PATH_BASE}environment-import-integrity.mts` as const;
const GUARDRAIL_EXECUTION_PARITY_PATH =
  `${CHECK_PATH_BASE}guardrail-execution-parity.mts` as const;
const GUARDRAIL_RUNNER_SHAPE_PATH =
  `${CHECK_PATH_BASE}guardrail-runner-shape.mts` as const;
const EVIDENCE_PRESENT_PATH = `${CHECK_PATH_BASE}evidence-present.mts` as const;
const EVIDENCE_VERIFIES_PATH = `${CHECK_PATH_BASE}evidence-verifies.mts` as const;
const WORKFLOW_FILES_PRESENT_PATH = `${CHECK_PATH_BASE}workflow-files-present.mts` as const;
const WORKFLOW_EXPRESSIONS_QUOTED_PATH =
  `${CHECK_PATH_BASE}workflow-expressions-quoted.mts` as const;
const NO_WORKFLOW_FORCE_DELETE_PATH =
  `${CHECK_PATH_BASE}no-workflow-force-delete.mts` as const;
const NATIVE_BINDINGS_PATH = `${CHECK_PATH_BASE}native-bindings.mts` as const;

/**
 * TODO (non-optional):
 * - Disallow inline template literals in GUARDRAILS values
 * - Require all paths to be named constants
 * - Enforce alphabetical key order
 * - Generate docs + CI checks from this file
 */
/**
 * Naming invariant:
 * - npm script: check:<name>
 * - file path: scripts/check-<name>.mts
 * - registry key must equal npm script name
 */
export const GUARDRAILS = Object.freeze({
  'check:ts-coverage': TS_COVERAGE_PATH,
  'check:check-contract': CHECK_CONTRACT_PATH,
  'check:side-effects': `${CHECK_PATH_BASE}side-effects.mts`,
  'check:side-effects:diff': `${CHECK_PATH_BASE}side-effects-diff.mts`,
  'check:script-semantics': `${CHECK_PATH_BASE}script-semantics.mts`,
  'check:script-json-parse': `${CHECK_PATH_BASE}script-json-parse.mts`,
  'check:npm-arg-forwarding': `${CHECK_PATH_BASE}npm-arg-forwarding.mts`,
  'check:lockfile-sync': LOCKFILE_SYNC_PATH,
  'check:lockfile-integrity': LOCKFILE_INTEGRITY_PATH,
  'check:package-manager-pin': PACKAGE_MANAGER_PIN_PATH,
  'check:ci-uses-npm-ci': CI_USES_NPM_CI_PATH,
  'check:function-size-budget': FUNCTION_SIZE_BUDGET_PATH,
  'check:no-vendor-shims': NO_VENDOR_SHIMS_PATH,
  'check:loader-contract': `${CHECK_PATH_BASE}loader-contract.mts`,
  'check:esm-loader-totality': ESM_LOADER_TOTALITY_PATH,
  'check:prisma-mock-loader-totality': PRISMA_MOCK_LOADER_TOTALITY_PATH,
  'check:script-runner-contract': SCRIPT_RUNNER_CONTRACT_PATH,
  'check:script-runtime-boundary': SCRIPT_RUNTIME_BOUNDARY_PATH,
  'check:no-script-alias-imports': NO_SCRIPT_ALIAS_IMPORTS_PATH,
  'check:no-ts-extension-imports': NO_TS_EXTENSION_IMPORTS_PATH,
  'check:esm-imports': ESM_IMPORTS_PATH,
  'check:type-only-imports': TYPE_ONLY_IMPORTS_PATH,
  'check:guardrail-no-runtime-io': GUARDRAIL_NO_RUNTIME_IO_PATH,
  'check:implicit-boolean': `${CHECK_PATH_BASE}implicit-boolean.mts`,
  'check:branded-literal': `${CHECK_PATH_BASE}branded-literal.mts`,
  'check:guardrail-self': `${CHECK_PATH_BASE}guardrail-self.mts`,
  'check:guardrail-time': `${CHECK_PATH_BASE}guardrail-time.mts`,
  'check:guardrail-registry': `${CHECK_PATH_BASE}guardrail-registry.mts`,
  'check:guardrail-name-path-bijection': `${CHECK_PATH_BASE}guardrail-name-path-bijection.mts`,
  'check:guardrail-doc-sync': `${CHECK_PATH_BASE}guardrail-doc-sync.mts`,
  'check:guardrail-execution': `${CHECK_PATH_BASE}guardrail-execution.mts`,
  'check:guardrail-execution-parity': GUARDRAIL_EXECUTION_PARITY_PATH,
  'check:guardrail-runner-shape': GUARDRAIL_RUNNER_SHAPE_PATH,
  'check:guardrail-helpers-exclusive': GUARDRAIL_HELPERS_EXCLUSIVE_PATH,
  'check:guardrail-subprocess-totality': GUARDRAIL_SUBPROCESS_TOTALITY_PATH,
  'check:evidence-present': EVIDENCE_PRESENT_PATH,
  'check:evidence-verifies': EVIDENCE_VERIFIES_PATH,
  'check:workflow-files-present': WORKFLOW_FILES_PRESENT_PATH,
  'check:workflow-expressions-quoted': WORKFLOW_EXPRESSIONS_QUOTED_PATH,
  'check:no-workflow-force-delete': NO_WORKFLOW_FORCE_DELETE_PATH,
  'check:ci-must-run-check': `${CHECK_PATH_BASE}ci-must-run-check.mts`,
  'check:ci-guardrail-coverage': `${CHECK_PATH_BASE}ci-guardrail-coverage.mts`,
  'check:execution-registry-completeness': `${CHECK_PATH_BASE}execution-registry-completeness.mts`,
  'check:no-orphan-check-files': `${CHECK_PATH_BASE}no-orphan-check-files.mts`,
  'check:no-orphan-scripts': `${CHECK_PATH_BASE}no-orphan-scripts.mts`,
  'check:server-entropy': `${CHECK_PATH_BASE}server-entropy.mts`,
  'check:ordering': `${CHECK_PATH_BASE}ordering.mts`,
  'check:identity': `${CHECK_PATH_BASE}identity.mts`,
  'check:config': `${CHECK_PATH_BASE}config.mts`,
  'check:config-init': `${CHECK_PATH_BASE}config-init.mts`,
  'check:config-lock': `${CHECK_PATH_BASE}config-lock.mts`,
  'check:config-snapshot': CONFIG_SNAPSHOT_PATH,
  'check:determinism': `${CHECK_PATH_BASE}determinism.mts`,
  'check:engine-prisma': `${CHECK_PATH_BASE}engine-prisma.mts`,
  'check:engine-date': `${CHECK_PATH_BASE}engine-date.mts`,
  'check:engine-optimality': ENGINE_OPTIMALITY_PATH,
  'check:engine-optimality-version': ENGINE_OPTIMALITY_VERSION_PATH,
  'check:engine-input-boundary': ENGINE_INPUT_BOUNDARY_PATH,
  'check:replay-staging-empty': REPLAY_STAGING_EMPTY_PATH,
  'check:replay-object-store': REPLAY_OBJECT_STORE_PATH,
  'check:env-contract': ENV_CONTRACT_PATH,
  'check:no-local-env-files': NO_LOCAL_ENV_FILES_PATH,
  'check:tmp-root-safety': TMP_ROOT_SAFETY_PATH,
  'check:temp-quota': TEMP_QUOTA_PATH,
  'check:tmp-root-shape': TMP_ROOT_SHAPE_PATH,
  'check:artifact-size-budgets': ARTIFACT_SIZE_BUDGETS_PATH,
  'check:native-bindings': NATIVE_BINDINGS_PATH,
  'check:vercel-parity': VERCEL_PARITY_PATH,
  'check:engine-version-gates': ENGINE_VERSION_GATES_PATH,
  'check:engine-version-bump': ENGINE_VERSION_BUMP_PATH,
  'check:engine-version-imports': ENGINE_VERSION_IMPORTS_PATH,
  'check:schema-evolution': SCHEMA_EVOLUTION_PATH,
  'check:schema-breaking-plan': SCHEMA_BREAKING_PLAN_PATH,
  'check:agents-doctrine-link': AGENTS_DOCTRINE_LINK_PATH,
  'check:doctrine-present': DOCTRINE_PRESENT_PATH,
  'check:change-isolation': CHANGE_ISOLATION_PATH,
  'check:authority-lint': `${CHECK_PATH_BASE}authority-lint.mts`,
  'check:authority-invariants': `${CHECK_PATH_BASE}authority-invariants.mts`,
  'check:prisma-assumptions': `${CHECK_PATH_BASE}prisma-assumptions.mts`,
  'check:dev-ui-parity': `${CHECK_PATH_BASE}dev-ui-parity.mts`,
  'check:shell-boundaries': `${CHECK_PATH_BASE}shell-boundaries.mts`,
  'check:environment-import-integrity': ENVIRONMENT_IMPORT_INTEGRITY_PATH,
  'check:route-collisions': `${CHECK_PATH_BASE}route-collisions.mts`,
  'check:user-pages-runtime': `${CHECK_PATH_BASE}user-pages-runtime.mts`,
  'check:catch-unknown': CATCH_UNKNOWN_PATH,
  'check:guardrails-core': `${CHECK_PATH_BASE}guardrails-core.mts`,
  'check:repo-guardrails': `${CHECK_PATH_BASE}repo-guardrails.mts`,
  'check:routes': `${CHECK_PATH_BASE}routes.mts`,
  'check:engine-freeze': `${CHECK_PATH_BASE}engine-freeze.mts`,
  'check:migrations': `${CHECK_PATH_BASE}migrations.mts`,
  'check:db-truth-boundary': DB_TRUTH_BOUNDARY_PATH,
  'check:db-runner-exclusivity': DB_RUNNER_EXCLUSIVITY_PATH,
  'check:db-constraint-coverage': DB_CONSTRAINT_COVERAGE_PATH,
  'check:db-constraint-naming': DB_CONSTRAINT_NAMING_PATH,
  'check:db-semantic-orm-agnostic': DB_SEMANTIC_ORM_AGNOSTIC_PATH,
  'check:db-semantic-suite-minimum': DB_SEMANTIC_SUITE_MINIMUM_PATH,
  'check:db-ledger-entrypoints': DB_LEDGER_ENTRYPOINTS_PATH,
  'check:db-accounting-replay': DB_ACCOUNTING_REPLAY_PATH,
  'check:accounting-invariants': ACCOUNTING_INVARIANTS_PATH,
  'check:accounting-proof-coverage': ACCOUNTING_PROOF_COVERAGE_PATH,
  'check:replay-equals-materialized': REPLAY_EQUALS_MATERIALIZED_PATH,
  'check:no-mutation': NO_MUTATION_PATH,
} as const);

export type GuardrailName = keyof typeof GUARDRAILS;
export type GuardrailPath = (typeof GUARDRAILS)[GuardrailName];
export function guardrailNameToPath(name: GuardrailName): GuardrailPath {
  return GUARDRAILS[name];
}
export const GUARDRAIL_NAMES = Object.freeze(Object.keys(GUARDRAILS) as GuardrailName[]);
