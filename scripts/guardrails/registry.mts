export const GUARDRAIL_ENTRYPOINT = 'check:guardrails' as const;

const SCRIPT_ROOT = 'scripts' as const;
const CHECK_PREFIX = 'check-' as const;
const CHECK_PATH_BASE = `${SCRIPT_ROOT}/${CHECK_PREFIX}` as const;
const CATCH_UNKNOWN_PATH = `${CHECK_PATH_BASE}catch-unknown.mts` as const;
const ESM_LOADER_TOTALITY_PATH = `${CHECK_PATH_BASE}esm-loader-totality.mts` as const;
const NO_SCRIPT_ALIAS_IMPORTS_PATH = `${CHECK_PATH_BASE}no-script-alias-imports.mts` as const;
const NO_TS_EXTENSION_IMPORTS_PATH = `${CHECK_PATH_BASE}no-ts-extension-imports.mts` as const;
const PRISMA_MOCK_LOADER_TOTALITY_PATH = `${CHECK_PATH_BASE}prisma-mock-loader-totality.mts` as const;
const SCRIPT_RUNNER_CONTRACT_PATH = `${CHECK_PATH_BASE}script-runner-contract.mts` as const;
const TS_COVERAGE_PATH = `${CHECK_PATH_BASE}ts-coverage.mts` as const;
const CHECK_CONTRACT_PATH = `${CHECK_PATH_BASE}check-contract.mts` as const;
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
const ACCOUNTING_INVARIANTS_PATH = `${CHECK_PATH_BASE}accounting-invariants.mts` as const;
const REPLAY_EQUALS_MATERIALIZED_PATH =
  `${CHECK_PATH_BASE}replay-equals-materialized.mts` as const;
const NO_MUTATION_PATH = `${CHECK_PATH_BASE}no-mutation.mts` as const;

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
  'check:loader-contract': `${CHECK_PATH_BASE}loader-contract.mts`,
  'check:esm-loader-totality': ESM_LOADER_TOTALITY_PATH,
  'check:prisma-mock-loader-totality': PRISMA_MOCK_LOADER_TOTALITY_PATH,
  'check:script-runner-contract': SCRIPT_RUNNER_CONTRACT_PATH,
  'check:no-script-alias-imports': NO_SCRIPT_ALIAS_IMPORTS_PATH,
  'check:no-ts-extension-imports': NO_TS_EXTENSION_IMPORTS_PATH,
  'check:guardrail-no-runtime-io': GUARDRAIL_NO_RUNTIME_IO_PATH,
  'check:implicit-boolean': `${CHECK_PATH_BASE}implicit-boolean.mts`,
  'check:branded-literal': `${CHECK_PATH_BASE}branded-literal.mts`,
  'check:guardrail-self': `${CHECK_PATH_BASE}guardrail-self.mts`,
  'check:guardrail-time': `${CHECK_PATH_BASE}guardrail-time.mts`,
  'check:guardrail-registry': `${CHECK_PATH_BASE}guardrail-registry.mts`,
  'check:guardrail-name-path-bijection': `${CHECK_PATH_BASE}guardrail-name-path-bijection.mts`,
  'check:guardrail-doc-sync': `${CHECK_PATH_BASE}guardrail-doc-sync.mts`,
  'check:guardrail-execution': `${CHECK_PATH_BASE}guardrail-execution.mts`,
  'check:guardrail-helpers-exclusive': GUARDRAIL_HELPERS_EXCLUSIVE_PATH,
  'check:guardrail-subprocess-totality': GUARDRAIL_SUBPROCESS_TOTALITY_PATH,
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
  'check:determinism': `${CHECK_PATH_BASE}determinism.mts`,
  'check:engine-prisma': `${CHECK_PATH_BASE}engine-prisma.mts`,
  'check:engine-date': `${CHECK_PATH_BASE}engine-date.mts`,
  'check:authority-lint': `${CHECK_PATH_BASE}authority-lint.mts`,
  'check:authority-invariants': `${CHECK_PATH_BASE}authority-invariants.mts`,
  'check:prisma-assumptions': `${CHECK_PATH_BASE}prisma-assumptions.mts`,
  'check:dev-ui-parity': `${CHECK_PATH_BASE}dev-ui-parity.mts`,
  'check:shell-boundaries': `${CHECK_PATH_BASE}shell-boundaries.mts`,
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
  'check:accounting-invariants': ACCOUNTING_INVARIANTS_PATH,
  'check:replay-equals-materialized': REPLAY_EQUALS_MATERIALIZED_PATH,
  'check:no-mutation': NO_MUTATION_PATH,
} as const);

export type GuardrailName = keyof typeof GUARDRAILS;
export type GuardrailPath = (typeof GUARDRAILS)[GuardrailName];
export function guardrailNameToPath(name: GuardrailName): GuardrailPath {
  return GUARDRAILS[name];
}
export const GUARDRAIL_NAMES = Object.freeze(Object.keys(GUARDRAILS) as GuardrailName[]);
