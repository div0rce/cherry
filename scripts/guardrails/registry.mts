export const GUARDRAIL_ENTRYPOINT = 'check:guardrails';

export const GUARDRAILS = [
  'check:side-effects',
  'check:side-effects:diff',
  'check:script-semantics',
  'check:loader-contract',
  'check:implicit-boolean',
  'check:branded-literal',
  'check:guardrail-self',
  'check:guardrail-time',
  'check:guardrail-registry',
  'check:ci-guardrail-coverage',
  'check:server-entropy',
  'check:ordering',
  'check:identity',
  'check:config',
  'check:config-init',
  'check:config-lock',
  'check:determinism',
  'check:engine-prisma',
  'check:engine-date',
  'check:authority-lint',
  'check:authority-invariants',
  'check:prisma-assumptions',
  'check:dev-ui-parity',
  'check:shell-boundaries',
  'check:route-collisions',
  'check:user-pages-runtime',
  'check:catch-unknown',
  'check:guardrails-core',
] as const;

export type GuardrailName = (typeof GUARDRAILS)[number];
