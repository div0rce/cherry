export const GUARDRAIL_ENTRYPOINT = 'check:guardrails' as const;

export const GUARDRAILS = {
  'check:side-effects': 'scripts/check-no-side-effects.mts',
  'check:side-effects:diff': 'scripts/check-side-effects-diff.mts',
  'check:script-semantics': 'scripts/check-script-module-semantics.mts',
  'check:loader-contract': 'scripts/check-esm-loader-contract.mts',
  'check:implicit-boolean': 'scripts/check-no-implicit-boolean.mts',
  'check:branded-literal': 'scripts/check-no-branded-literal.mts',
  'check:guardrail-self': 'scripts/check-guardrail-self-consistency.mts',
  'check:guardrail-time': 'scripts/check-guardrail-timestamp-source.mts',
  'check:guardrail-registry': 'scripts/check-guardrail-registry-completeness.mts',
  'check:ci-guardrail-coverage': 'scripts/check-ci-guardrail-coverage.mts',
  'check:no-orphan-scripts': 'scripts/check-no-orphan-scripts.mts',
  'check:no-non-check-scripts': 'scripts/check-no-non-check-scripts.mts',
  'check:server-entropy': 'scripts/check-no-server-entropy.mts',
  'check:ordering': 'scripts/check-no-implicit-ordering.mts',
  'check:identity': 'scripts/check-no-implicit-identity.mts',
  'check:config': 'scripts/check-no-implicit-config.mts',
  'check:config-init': 'scripts/check-config-init-boundaries.mts',
  'check:config-lock': 'scripts/check-config-locking.mts',
  'check:determinism': 'scripts/check-no-implicit-time.mts',
  'check:engine-prisma': 'scripts/check-no-engine-prisma.mts',
  'check:engine-date': 'scripts/check-no-engine-date.mts',
  'check:authority-lint': 'scripts/check-authority-lint.mts',
  'check:authority-invariants': 'scripts/check-authority-invariants.mts',
  'check:prisma-assumptions': 'scripts/check-prisma-assumptions.mts',
  'check:dev-ui-parity': 'scripts/check-dev-ui-parity.mts',
  'check:shell-boundaries': 'scripts/check-shell-boundaries.mts',
  'check:route-collisions': 'scripts/check-route-collisions.mts',
  'check:user-pages-runtime': 'scripts/check-user-pages-runtime-only.mts',
  'check:catch-unknown': 'scripts/check-catch-unknown.mts',
  'check:guardrails-core': 'scripts/check-guardrails.mts',
  'check:repo-guardrails': 'scripts/check-repo-guardrails.mts',
  'check:routes': 'scripts/check-routes-structure.mts',
  'check:engine-freeze': 'scripts/check-engine-freeze.mts',
  'check:migrations': 'scripts/check-migrations.mts',
  'check:db': 'scripts/check-db-smoke.mts',
} as const;

export type GuardrailName = keyof typeof GUARDRAILS;
export type GuardrailPath = (typeof GUARDRAILS)[GuardrailName];
export const GUARDRAIL_NAMES = Object.keys(GUARDRAILS) as GuardrailName[];
