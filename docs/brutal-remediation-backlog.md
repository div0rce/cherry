## (FIXED) 1. P0 — Purge sensitive bank CSVs and replace them with synthetic fixtures

* `Priority`: `P0`
* `Owner Domain`: `security`
* `Owner Role`: `security-owner`
* `Owner Scope`: `data/bank/*`, ingest fixtures, docs that imply real financial fixture data
* `Why now`: Sensitive-looking financial data in the repo is the highest-severity operational risk.
* `Dependencies`: none
* `PR Order`: `1`
* `Acceptance Criteria`:

  * real-looking bank CSVs are removed from tracked repo content
  * synthetic replacements exist for ingest and test paths
  * docs state that only synthetic financial fixtures are allowed
* `Out of Scope`:

  * new ingest features
  * historical data enrichment

---

## (FIXED) 2. P0 — Eliminate repo-managed live secret files and reduce env surface to documented examples

* `Priority`: `P0`
* `Owner Domain`: `infra`
* `Owner Role`: `infra-owner`
* `Owner Scope`: local `.env*` handling, `.env.example`, environment docs
* `Why now`: Live secret sprawl distorts operational state and creates avoidable disclosure risk.
* `Dependencies`: none
* `PR Order`: `2`
* `Acceptance Criteria`:

  * live secret values are no longer repo-managed workspace state
  * `.env.example` is the only documented env contract file
  * docs explicitly forbid storing live secrets in the workspace
* `Out of Scope`:

  * deploy platform redesign
  * secret manager rollout beyond what is needed to remove repo-managed live values

---

## (FIXED) 3. P0 — Require explicit operator authorization for destructive admin HTTP routes or remove the HTTP surface

* `Priority`: `P0`
* `Owner Domain`: `security`
* `Owner Role`: `security-owner`
* `Owner Scope`: `app/api/admin/*`, related auth helpers, admin and dev docs
* `Why now`: Current destructive admin posture is too weak even for development use.
* `Dependencies`: none
* `PR Order`: `3`
* `Acceptance Criteria`:

  * destructive routes are removed from HTTP or gated by explicit operator authorization
  * authenticated dev-user access alone is no longer sufficient
  * docs reflect the new boundary
* `Out of Scope`:

  * general admin UX improvements
  * new operator tooling

---

## (FIXED) 4. P0 — Enforce Vine signature verification in all production paths

* `Priority`: `P0`
* `Owner Domain`: `security`
* `Owner Role`: `security-owner`
* `Owner Scope`: Vine security config, runtime semantics, related docs
* `Why now`: Warn/off downgrade modes are incompatible with a trustworthy production integrity boundary.
* `Dependencies`: none
* `PR Order`: `4`
* `Acceptance Criteria`:

  * production cannot run with `warn` or `off` signature behavior
  * weaker modes are explicitly non-production only
  * failures are structured and observable
  * documentation names the exact production behavior and the exact non-production downgrade behavior
* `Out of Scope`:

  * broader Vine feature expansion
  * new hardware integrations

---

## (FIXED) 5. P0 — Hide or gate deceptive product surfaces that are not backed by live state

* `Priority`: `P0`
* `Owner Domain`: `ui`
* `Owner Role`: `frontend-owner`
* `Owner Scope`: home shell exposure, wallet pass exposure, verification claims, Vine verification claims
* `Why now`: Fake-complete surfaces create product dishonesty and conceal system truth.
* `Dependencies`: none
* `PR Order`: `5`
* `Acceptance Criteria`:

  * static home shell is hidden or demo-only
  * wallet pass remains disabled
  * no product surface implies automated verification exists when it does not
  * no surface implies engine richness not actually present in live runtime state
* `Out of Scope`:

  * redesign work
  * adding replacement surfaces before live state exists

---

## (FIXED) 6. P1 — Make production engine state materially match decision assumptions

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: runtime engine-state adapter, bucket essentiality, debt loading, cash snapshot loading, constraint loading
* `Why now`: The most damaging current defect is that the production adapter does not provide the solver with the state its own objective, constraints, and proof language assume exists.
* `Dependencies`: issues `1` through `5`
* `PR Order`: `6`
* `Acceptance Criteria`:

  * runtime state includes truthful essential-bucket semantics
  * runtime state includes debt accounts used by simulation and constraint evaluation
  * runtime state includes usable liquid cash data
  * runtime state includes non-inert utilization and related financial constraints where such data exists
  * missing financial primitives are surfaced explicitly as degraded capability, not silently collapsed into default-safe-looking state
  * docs state exactly which primitives are required for live advisory truth
* `Out of Scope`:

  * new advisory features
  * UI redesign
  * long-horizon forecasting

---

## (FIXED) 7. P1 — Repair engine objective and reward-unit semantics

* `Priority`: P1
* `Owner Domain`: simulation
* `Owner Role`: engine-owner
* `Owner Scope`: objective function, reward-unit semantics, score dimensions, placeholder terms, live scoring docs
* `Why now`: A canonical contract built on incoherent units only standardizes wrong behavior.
* `Dependencies`: issues `1` through `6`
* `PR Order`: 7
* `Acceptance Criteria`:
    * reward semantics are unit-consistent across engine, public output, and any explanation layer
    * `POINTS_PER_DOLLAR` handling is explicitly defined and no longer contradicts public benefit logic
    * live score dimensions have explicit interpretation
    * placeholder dimensions such as volatility and `ruleViolations` are either implemented truthfully or removed from live scoring
    * the live objective is documented as either coherent optimization or explicitly bounded heuristic scoring without inflated claims
* Out of Scope:
    * large-scale research optimization redesign
    * adding entirely new decision families

---

## (FIXED) 8. P1 — Repair rail-faithful simulation and temporal honesty

* `Priority`: P1
* `Owner Domain`: simulation
* `Owner Role`: engine-owner
* `Owner Scope`: debit/cash mutation, credit liability mutation, pending vs posted semantics, scheduled paydowns, action timing semantics
* `Why now`: The current simulator can produce numerically false decisions even if the architecture converges.
* `Dependencies`: issues `1` through `7`
* `PR Order`: 8
* `Acceptance Criteria`:
    * debit/cash spends reduce projected liquid correctly
    * credit spends mutate the correct liability via stable identity rather than label equivalence
    * purchase-state transitions document and enforce pending vs posted semantics
    * scheduled paydowns are retained with explicit `effectiveAtMs` / `decisionTimeMs` semantics
    * scheduled paydowns with `effectiveAtMs > decisionTimeMs` do not mutate present state or justify present recommendations
    * only already-effective paydowns may affect present simulation or ranking
    * live time semantics are documented explicitly rather than implied by field names alone
* `Out of Scope`:
    * multistep planning
    * future merchant optimization research
    * full long-horizon forecasting
    * generic future-obligation planning

---

## (FIXED) 8.1. P1 — Enforce unresolvable credit liability as a hard simulation invariant

* `Priority`: P1
* `Owner Domain`: simulation
* `Owner Role`: engine-owner
* `Owner Scope`: credit-candidate validity, hard-constraint filtering, runtime warning path for invalid credit actions
* `Why now`: Credit actions without stable liability linkage are not truthful simulation states and must not survive to ranked output.
* `Dependencies`: issues `1` through `8`
* `PR Order`: 8.1
* `Acceptance Criteria`:
    * for live credit-spend candidates `(USE_CARD, USE_CARD_WITH_PAYDOWN)`, unresolvable credit liability adds `HARD:UNRESOLVABLE_CREDIT_LIABILITY` to `constraintsBreached`
    * invalid credit candidates are excluded by the existing hard-constraint filter
    * invalid credit candidates emit a warning through `EngineRuntime.logger`
    * `simulateAction` remains pure and defensive; unresolved liability still causes no debt mutation, but that fallback does not survive into ranked output
* `Out of Scope`:
    * synthetic debt linkage
    * label-based liability matching revival
    * route-level degradation policy

---

## (FIXED) 8.2. P1 — Add liquidity-aware single-step credit affordability pressure

* `Priority`: P1
* `Owner Domain`: simulation
* `Owner Role`: engine-owner
* `Owner Scope`: present-time projection semantics for credit affordability, runway interaction, composite action ordering
* `Why now`: After PR8.1, valid credit actions still remained structurally too cheap because they raised debt without sharing the same one-step affordability-pressure channel as debit.
* `Dependencies`: issues 1 through 8.1
* `PR Order`: 8.2
* `Acceptance Criteria`:
    * debit-like purchases reduce `projectedLiquidCents` by purchase amount
    * valid credit purchases with `linkedDebtId` both increase debt and reduce `projectedLiquidCents` by purchase amount
    * `USE_CARD_WITH_PAYDOWN` remains strictly ordered as purchase first, paydown second
    * net composite projections stay internally consistent:
        * debt: +purchase - paydown
        * liquid: -purchase - paydown
    * `projectedLiquidCents` is documented as a present-time affordability-pressure projection, not a literal bank-cash statement for credit paths
* Out of Scope:
    * interest modeling
    * billing-cycle semantics
    * repayment scheduling
    * multistep planning

---

## (FIXED) 8.3. P1 — Canonical runtime degradation for unresolvable credit liability

* `Priority`: P1
* `Owner Domain`: simulation
* `Owner Role`: engine-owner
* `Owner Scope`: live Prisma runtime consequence of unresolvable credit liability, canonical exclusion metadata, shared degradation derivation, truthful route/advisory degradation behavior
* `Why now`: The live Prisma runtime currently loads linkedDebtId: null for all cards and debts: unavailable(), so PR8.1 truthfully invalidates live credit candidates unless that exclusion is surfaced explicitly.
* `Dependencies`: issues 1 through 8.2
* `PR Order`: 8.3
* `Status`: Closed. Shared degradation propagation, no synthetic card winner behavior, wrapper exclusion preservation, projectedLiquidCents guardrail, Prisma-backed runtime proof, stale-preview clearing, structured Vine failure, simulate contract hardening, and canonical unresolvable-credit-liability naming are all landed.
* `Acceptance Criteria`:
    * successful engine solve outcomes carry mandatory exclusion metadata:
        * `creditActionsGeneratedCount`
        * `creditUnresolvableLiabilityCount`
    * exclusion-driven degradation is derived if and only if `creditUnresolvableLiabilityCount > 0`
    * all degradation semantics come from one shared helper / derivation path
    * `/api/scan`, `/api/sessions`, and `/api/simulate` always include:
        * `degradation`: { code, message } | null
    * if excluded credit actions leave only non-card truthful survivors, card recommendation fields are null/absent and no synthetic legacy card winner is fabricated
    * if excluded credit actions leave no truthful surviving action, fallback/no-decision responses preserve the same degradation
    * Autopilot and Vine reuse the same unresolvable-credit-liability derivation and do not hand-roll a separate detection rule
    * direct runtime-path tests prove the Prisma adapter currently loads:
        * `linkedDebtId: null`
        * `debts: unavailable()`
        * `capabilities.debt.available !== true`
    * `projectedLiquidCents` gains a structural guardrail so new literal-cash consumers fail review/CI outside an approved allowlist
    * Prisma-backed runtime consequence tests prove `/api/scan`, `/api/simulate`, and Autopilot preview preserve unresolvable-credit-liability degradation without leaking a synthetic card winner
    * public user-facing strings do not describe the projection as literal bank cash
    * `/api/sessions` remains covered through the shared route-level degradation shaping path; no separate Prisma-backed runtime integration test is required while that shaping path remains shared
* Out of Scope:
    * real runtime debt-link population
    * heuristic credit fallback
    * solver truncation / pruning / maxCandidates
    * PR9 search-correctness work
---

## 9. P1 — Remove order-biased candidate truncation or replace it with principled pruning

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: candidate generation, pre-score pruning, solver evaluation order
* `Why now`: Candidate-generation order currently changes optimization results through pre-score truncation, which directly contaminates decision quality.
* `Dependencies`: issues `6` through `8`
* `PR Order`: `9`
* `Acceptance Criteria`:

  * live solver behavior is not changed by arbitrary generation order
  * `maxCandidates` behavior is either removed, applied after principled dominance filtering, or justified by documented pruning semantics
  * docs clearly distinguish bounded search-space limits from correctness guarantees
* `Out of Scope`:

  * expanding the action space solely for feature growth
  * theoretical optimality claims beyond what is actually supported

---

## 10. P1 — Introduce unit-consistent objective and explicit utility semantics

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: objective function, reward normalization, penalty semantics, scoring interpretation, explanation alignment
* `Why now`: Current scoring is a disciplined heuristic but not yet a coherent optimization target. Now that state, constraints, credit validity, degradation, and temporal semantics are stable, Cherry can start making the objective mathematically interpretable.
* `Dependencies`: issues `1` through `9`
* `PR Order`: `10`
* `Acceptance Criteria`:

  * all reward signals map to a canonical unit, such as USD or utility-adjusted USD
  * `POINTS_PER_DOLLAR` converts through an explicit value mapping
  * liquidity / affordability pressure is expressed in the same canonical unit or explicitly documented as a bounded non-utility heuristic term
  * score dimensions are no longer mixed-unit without conversion
  * every live score component has a defined interpretation
  * the objective is documented as either:

    * coherent optimization over a stated utility function, or
    * explicitly bounded heuristic scoring with defined semantics
  * explanation-layer benefit language reflects the same unit-consistent interpretation
* `Out of Scope`:

  * multistep planning
  * stochastic optimization
  * long-horizon forecasting
  * new decision families

---

## 11. P2 — Add multi-step / horizon-aware optimization as an optional research track

* `Priority`: `P2`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: action horizons, sequential simulation, multi-step policy evaluation, future-state rollout semantics
* `Why now`: Once the single-step objective is unit-consistent, Cherry can optionally evaluate whether decisions should optimize over a short explicit horizon rather than only the immediate action.
* `Dependencies`: issue `10`
* `PR Order`: `11`
* `Acceptance Criteria`:

  * horizon length is explicitly defined
  * future state transitions are modeled separately from present-time recommendation semantics
  * multi-step evaluation does not allow future events to justify present recommendations unless the policy explicitly permits it
  * docs distinguish single-step recommendation from horizon-aware planning
  * any multi-step output is labeled as planning or projection, not present fact
* `Out of Scope`:

  * full long-horizon financial planning
  * generic future-obligation planning
  * stochastic uncertainty modeling
  * UI redesign

---

## 12. P2 — Add uncertainty modeling for expected-value decisions as an optional research track

* `Priority`: `P2`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: expected value, uncertainty distributions, probabilistic income/expense assumptions, risk-adjusted scoring
* `Why now`: True financial optimization requires reasoning under uncertainty, but this should only happen after Cherry has a coherent single-step objective and optionally a horizon-aware model.
* `Dependencies`: issues `10` and optionally `11`
* `PR Order`: `12`
* `Acceptance Criteria`:

  * uncertain quantities are represented explicitly rather than hidden inside constants
  * expected value calculations identify assumptions and distributions
  * risk-adjusted terms are documented and unit-consistent
  * deterministic and probabilistic modes are clearly separated
  * public explanations do not imply certainty where the model only has expectation
* `Out of Scope`:

  * full actuarial modeling
  * investment advice
  * broad macroeconomic forecasting
  * production rollout unless the model is explainable and bounded

---

## 13. P1 — Align public advisory explanations with actual engine rationale

* `Priority`: `P1`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: public advisory contract, explanation fields, benefit semantics, autopilot explanation language
* `Why now`: Cherry remains dishonest if the public layer explains recommendations using a rationale different from the one the engine actually used.
* `Dependencies`: issues `6` through `10`
* `PR Order`: `13`
* `Acceptance Criteria`:

  * public explanation fields derive from actual decision rationale
  * reward-gap language is not used as a universal explanation when the true driver is runway, debt structure, or constraints
  * unsupported internal action richness is either exposed honestly or removed from the live public path
  * “best card” messaging is not allowed to stand in for broader action reasoning unless the live product intentionally narrows itself to a card recommender
* `Out of Scope`:

  * marketing copy changes
  * UI polish not needed for explanation truth

---

## 14. P1 — Make proof, test, and documentation claims runtime-faithful

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: optimality docs, proof language, runtime-faithful tests, synthetic-vs-live claim boundaries
* `Why now`: The repo currently risks overstating trust by presenting bounded, synthetic, self-consistent proofs in a way that can be over-read as broader validation.
* `Dependencies`: issues `6` through `13`
* `PR Order`: `14`
* `Acceptance Criteria`:

  * docs explicitly distinguish bounded exact optimality from global or real-world optimality
  * self-consistency tests are not framed as independent correctness proofs
  * runtime-faithful integration tests exist for the canonical lifecycle path
  * synthetic candidate-space and state-fixture limitations are named clearly
  * docs do not imply stronger live guarantees than the runtime path deserves
* `Out of Scope`:

  * formal methods research
  * new benchmark theater

---

## 15. P1 — Define the canonical simulation response contract from solver output

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: canonical solver-derived advisory and simulation contract
* `Why now`: Convergence is impossible while public simulation semantics remain ambiguous, but that convergence must occur only after live engine semantics are truthful enough to standardize.
* `Dependencies`: issues `1` through `14`
* `PR Order`: `15`
* `Acceptance Criteria`:

  * one documented response contract exists
  * the canonical response contract is defined in one location
  * the canonical contract lives in a single exported module such as `lib/contracts/simulation.ts`
  * that location becomes the only public type used by simulation and advisory routes
  * downstream routes import the same type rather than redeclaring response shapes
  * the contract is derived from canonical live engine semantics, not from legacy mapping or public-wrapper drift
* `Out of Scope`:

  * route rewrites not needed to establish the contract
  * new simulation features

---

## 16. P1 — Decide verification automation truthfully before route convergence

* `Priority`: `P1`
* `Owner Domain`: `sessions`
* `Owner Role`: `sessions-owner`
* `Owner Scope`: verification automation semantics, lifecycle truth, session state machine, docs and product claims
* `Why now`: The lifecycle cannot converge until Cherry explicitly decides whether verification is automated now, confirmation-only now, or partially manual now.
* `Dependencies`: issues `1` through `15`
* `PR Order`: `16`
* `Acceptance Criteria`:

  * the lifecycle explicitly chooses whether verification is automated now or not
  * there is no fake automation state left
  * ledger mutation preconditions are explicitly defined
  * session terminality is defined against the chosen lifecycle shape
  * the chosen lifecycle is documented as the canonical path for downstream APIs and UI
* `Out of Scope`:

  * speculative verification channels beyond the chosen immediate truth
  * feature work unrelated to lifecycle correctness

---

## 17. P1 — Converge `/api/scan`, `/api/simulate`, and autopilot preview on the canonical simulation contract

* `Priority`: `P1`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: public advisory and simulation endpoints and shared response semantics
* `Why now`: Route-level divergence will keep recreating parallel systems unless convergence happens at the API boundary.
* `Dependencies`: issues `15` and `16`
* `PR Order`: `17`
* `Acceptance Criteria`:

  * these routes stop diverging in output shape
  * legacy-response mapping is reduced rather than expanded
  * public advisory output does not collapse richer internal semantics into contradictory wrapper semantics
  * docs describe one route-family contract
* `Out of Scope`:

  * new entry routes
  * adding more preview or advisory surfaces

---

## 18. P1 — Quarantine or delete the legacy simulation engine

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: `lib/simulation.ts` and any runtime references
* `Why now`: Keeping archived simulation semantics in runtime truth invites reintroduction of parallel logic.
* `Dependencies`: issue `15`
* `PR Order`: `18`
* `Acceptance Criteria`:

  * archived simulation is removed from runtime truth or deleted
  * no runtime path depends on legacy simulation semantics
  * docs stop presenting two simulation engines as peers
* `Out of Scope`:

  * historical archiving beyond what is needed to remove runtime ambiguity

---

## 19. P1 — Remove wrapper-only simulation indirection that adds no boundary semantics

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: simulation and advisory wrappers that only relay or reshape legacy-compatible output
* `Why now`: Wrapper sprawl makes the architecture look deeper than it is and blocks convergence.
* `Dependencies`: issues `15`, `17`, and `18`
* `PR Order`: `19`
* `Acceptance Criteria`:

  * each remaining adapter has a real boundary purpose
  * wrapper-only indirection is deleted or explicitly justified
  * wrapper layers are not allowed to exist purely to preserve fake compatibility with obsolete semantics
* `Out of Scope`:

  * new abstraction layers
  * refactors unrelated to simulation or advisory convergence

---

## 20. P2 — Complete the canonical advisory lifecycle slice

* `Priority`: `P2`
* `Owner Domain`: `sessions`
* `Owner Role`: `sessions-owner`
* `Owner Scope`: the exact lifecycle defined in this document
* `Why now`: This is the first real product milestone and the first proof that Cherry is more than a convincing prototype.
* `Dependencies`: issues `1` through `19` as applicable
* `PR Order`: `20`
* `Acceptance Criteria`:

  * `/api/scan` produces the canonical engine decision
  * that decision creates an advisory session
  * the session reaches terminal state as defined in this document
  * confirmation or verification completes according to issue `16`
  * ledger mutation occurs deterministically
  * the resulting state is visible in the home shell
  * no legacy mapping is required in the canonical lifecycle path
  * degraded and broken states are not silently rewritten into empty success-looking responses
* `Out of Scope`:

  * new surfaces
  * wallet activation
  * extra lifecycle variants

---

## 21. P2 — Rebuild the home shell from live state only

* `Priority`: `P2`
* `Owner Domain`: `ui`
* `Owner Role`: `frontend-owner`
* `Owner Scope`: home and dashboard read model
* `Why now`: The home shell must stop lying once the lifecycle slice is real.
* `Dependencies`: issue `20`
* `PR Order`: `21`
* `Acceptance Criteria`:

  * no UI component reads from static fixtures
  * all dashboard metrics originate from session- and ledger-backed live state
  * degraded backend responses surface explicitly
  * static sample metrics do not remain in the production shell
  * the shell does not imply richer engine capability than the live runtime actually supports
* `Out of Scope`:

  * design polish beyond what is needed to present live state honestly
  * new dashboard surfaces

---

## 22. P2 — Fix degraded-vs-empty semantics on user-facing routes

* `Priority`: `P2`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: user-facing read endpoints that currently mask failures as empty state
* `Why now`: Broken state and empty state must be distinguishable if the home shell is going to be trustworthy.
* `Dependencies`: issues `20` and `21`
* `PR Order`: `22`
* `Acceptance Criteria`:

  * broken state and empty state are distinguishable
  * degraded responses are explicit and documented
  * routes do not silently convert missing engine prerequisites into success-looking emptiness
* `Out of Scope`:

  * new read models unrelated to lifecycle visibility

---

## 23. P3 — Re-run dependency and API analysis with a parser that can generate a credible full import graph

* `Priority`: `P3`
* `Owner Domain`: `infra`
* `Owner Role`: `infra-owner`
* `Owner Scope`: audit and tooling only
* `Why now`: Current dead-code numbers are too weak to justify cleanup.
* `Dependencies`: issues `1` through `22`
* `PR Order`: `23`
* `Acceptance Criteria`:

  * graph edge counts are credible for repo size
  * API extraction is trustworthy enough to support cleanup decisions
  * unreachable-module detection is strong enough to support targeted cleanup
  * no cleanup plan relies on the current weak graph output
* `Out of Scope`:

  * product behavior changes
  * code deletion driven by current weak analysis

---

## 24. P3 — Perform targeted dead-code cleanup only after the stronger analysis lands

* `Priority`: `P3`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: orphaned and legacy modules proven by improved analysis
* `Why now`: Cleanup is only safe after the import graph is trustworthy.
* `Dependencies`: issue `23`
* `PR Order`: `24`
* `Acceptance Criteria`:

  * deletions are evidence-backed
  * no bulk cleanup is done from the current dead-code numbers
  * cleanup does not reintroduce hidden second systems through archive leftovers or shadow utility paths
* `Out of Scope`:

  * opportunistic mass deletion
  * cleanup justified by impression rather than evidence

---

## Verdict

Your backlog gets Cherry to:

> truthful advisory + canonical lifecycle + live-state UI

It does **not yet** get Cherry to:

> closed-loop financial controller with execution authority, durable trust, and market-grade reliability

You need backlog items for **data ingestion, consent, execution, reversibility, auditability, liability, and controlled rollout**.

---

# Add These Issues

## 25. P0 — Define user consent, permissions, and action authority boundary

* `Priority`: `P0`
* `Owner Domain`: `security`
* `Owner Role`: `security-owner`
* `Owner Scope`: user authorization, consent records, execution permissions, revocation semantics
* `Why now`: Cherry cannot execute financial actions unless it has an explicit, auditable authority model.
* `Dependencies`: issues `1` through `22`
* `PR Order`: `25`
* `Acceptance Criteria`:

  * every action class has an explicit permission requirement
  * user consent is persisted with timestamp, scope, actor, and revocation state
  * read-only, advisory, confirmation-required, and autonomous modes are distinct
  * no execution-capable path can run under advisory-only consent
  * docs define exactly what Cherry is allowed to do
* `Out of Scope`:

  * payment rail integration
  * bank/provider onboarding

---

## 26. P0 — Add immutable audit ledger for recommendations, decisions, confirmations, and mutations

* `Priority`: `P0`
* `Owner Domain`: `ledger`
* `Owner Role`: `ledger-owner`
* `Owner Scope`: audit events, decision records, state transition trace, actor attribution
* `Why now`: A finance controller without an immutable audit trail is unserious.
* `Dependencies`: issues `15`, `16`, `20`, `25`
* `PR Order`: `26`
* `Acceptance Criteria`:

  * every recommendation has a persisted decision record
  * every user confirmation is linked to the decision it approved
  * every ledger mutation references the originating decision/session
  * every execution attempt records request, response, status, error, and idempotency key
  * audit records are append-only
  * no mutation exists without provenance
* `Out of Scope`:

  * analytics dashboards
  * external compliance export

---

## 27. P0 — Establish idempotent financial action execution semantics

* `Priority`: `P0`
* `Owner Domain`: `execution`
* `Owner Role`: `execution-owner`
* `Owner Scope`: idempotency keys, execution attempts, retries, duplicate prevention, terminal execution states
* `Why now`: Retrying money movement without hard idempotency is how toy systems become financial shrapnel.
* `Dependencies`: issues `25` and `26`
* `PR Order`: `27`
* `Acceptance Criteria`:

  * every executable financial action has a stable idempotency key
  * retry behavior is explicitly defined
  * duplicate execution is prevented by storage-level constraints
  * execution states include at least:

    * `PENDING`
    * `SUBMITTED`
    * `SUCCEEDED`
    * `FAILED`
    * `CANCELED`
    * `REVERSED`
    * `UNKNOWN`
  * unknown execution state is never treated as success
  * docs define recovery behavior for partial failure
* `Out of Scope`:

  * real payment providers
  * autonomous execution policy

---

## 28. P1 — Build provider-agnostic financial account connection model

* `Priority`: `P1`
* `Owner Domain`: `integrations`
* `Owner Role`: `integrations-owner`
* `Owner Scope`: connected accounts, provider tokens, account identity, account capabilities
* `Why now`: Cherry needs real state, but provider details must not leak into engine truth.
* `Dependencies`: issues `25` through `27`
* `PR Order`: `28`
* `Acceptance Criteria`:

  * connected accounts are represented behind a provider-agnostic model
  * provider account IDs are mapped to stable internal account IDs
  * account capabilities are explicit:

    * balance readable
    * transactions readable
    * payments executable
    * transfers executable
    * credit liability readable
  * unavailable capabilities degrade explicitly
  * engine state uses internal canonical identities, not provider-native IDs
* `Out of Scope`:

  * supporting many providers
  * payment execution

---

## 29. P1 — Add transaction ingestion, normalization, and reconciliation pipeline

* `Priority`: `P1`
* `Owner Domain`: `ingest`
* `Owner Role`: `ingest-owner`
* `Owner Scope`: transactions, balances, pending/posted reconciliation, account snapshots
* `Why now`: Closed-loop finance requires durable observed state, not one-off request snapshots.
* `Dependencies`: issue `28`
* `PR Order`: `29`
* `Acceptance Criteria`:

  * transactions ingest into canonical normalized records
  * pending and posted transactions are distinct
  * duplicate provider transactions are deduplicated
  * balance snapshots are timestamped
  * stale balances are marked degraded
  * reconciliation detects mismatch between projected and observed state
  * reconciliation mismatch blocks autonomous execution until resolved
* `Out of Scope`:

  * merchant intelligence
  * category ML
  * forecasting

---

## 30. P1 — Implement stable liability linkage for cards, debts, and repayment targets

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: credit cards, linked liabilities, repayment targets, account identity graph
* `Why now`: Earlier degradation tells the truth about missing liability truth. This issue actually fixes the missing truth.
* `Dependencies`: issues `28` and `29`
* `PR Order`: `30`
* `Acceptance Criteria`:

  * credit cards link to canonical liabilities through stable identity
  * repayment targets are explicit
  * liability balances are loaded from live state where available
  * unlinked credit accounts remain degraded
  * label/name matching is not used as a truth source
  * runtime tests prove valid card actions survive hard-constraint filtering when linkage exists
* `Out of Scope`:

  * interest optimization
  * balance transfer products
  * synthetic linkage

---

## 31. P1 — Add reversible execution and compensation semantics

* `Priority`: `P1`
* `Owner Domain`: `execution`
* `Owner Role`: `execution-owner`
* `Owner Scope`: cancellation, reversal, compensating actions, failed execution recovery
* `Why now`: Finance systems need a plan for being wrong.
* `Dependencies`: issues `27` through `30`
* `PR Order`: `31`
* `Acceptance Criteria`:

  * each executable action declares whether it is reversible
  * reversible actions define cancellation window
  * irreversible actions require stricter confirmation policy
  * failed partial execution creates a recovery task
  * compensation actions are represented separately from original actions
  * UI/API never implies reversibility where none exists
* `Out of Scope`:

  * legal dispute handling
  * customer support tooling

---

## 32. P1 — Add execution-safe policy modes

* `Priority`: `P1`
* `Owner Domain`: `execution`
* `Owner Role`: `execution-owner`
* `Owner Scope`: advisory mode, confirmation mode, supervised automation, autonomous automation
* `Why now`: Cherry needs staged authority. Jumping from recommendations to autonomy is how systems die.
* `Dependencies`: issues `25` through `31`
* `PR Order`: `32`
* `Acceptance Criteria`:

  * modes are explicit:

    * `ADVISORY_ONLY`
    * `CONFIRM_EACH_ACTION`
    * `SUPERVISED_AUTOPILOT`
    * `AUTONOMOUS_LIMITED`
  * each mode has allowed action classes
  * each mode has max dollar limits
  * each mode has degradation behavior
  * autonomous modes are disabled unless all required primitives are available
  * mode escalation requires explicit user consent
* `Out of Scope`:

  * growth onboarding
  * marketing surfaces

---

## 33. P1 — Define safety envelopes and hard financial guardrails

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: minimum cash floor, overdraft prevention, debt-payment limits, execution blockers
* `Why now`: Optimization without hard guardrails is just elegant negligence.
* `Dependencies`: issues `30` through `32`
* `PR Order`: `33`
* `Acceptance Criteria`:

  * minimum liquidity floor is explicit
  * overdraft-risk actions are blocked
  * debt paydowns cannot consume protected cash
  * execution is blocked on stale balances
  * execution is blocked on unresolved reconciliation mismatch
  * guardrails are enforced below the UI/API layer
  * guardrail breaches are auditable
* `Out of Scope`:

  * personalized financial advice regulation strategy
  * investment risk modeling

---

## 34. P2 — Add billing-cycle, interest, due-date, and minimum-payment semantics

* `Priority`: `P2`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: credit cycles, APR, due dates, statement balances, minimum payments
* `Why now`: Debt optimization is fake without credit-cycle mechanics.
* `Dependencies`: issues `30` and `33`
* `PR Order`: `34`
* `Acceptance Criteria`:

  * credit accounts include APR where available
  * statement balance and current balance are distinct
  * due dates are represented explicitly
  * minimum payment obligations are modeled
  * late-payment risk is a hard constraint or explicit penalty
  * payoff recommendations distinguish interest savings from liquidity pressure
* `Out of Scope`:

  * balance transfers
  * credit-score prediction
  * loan refinancing

---

## 35. P2 — Add recurring obligations and cashflow calendar

* `Priority`: `P2`
* `Owner Domain`: `planning`
* `Owner Role`: `planning-owner`
* `Owner Scope`: income, rent, subscriptions, recurring bills, expected obligations
* `Why now`: Present-time decisions are incomplete if near-future mandatory cashflows are invisible.
* `Dependencies`: issues `29`, `33`, and optionally `34`
* `PR Order`: `35`
* `Acceptance Criteria`:

  * recurring income is represented explicitly
  * recurring obligations are represented explicitly
  * obligation confidence is tracked
  * near-future obligations affect liquidity guardrails
  * uncertain obligations are not treated as guaranteed truth
  * docs distinguish observed recurring patterns from user-confirmed obligations
* `Out of Scope`:

  * full forecasting engine
  * tax planning
  * investment planning

---

## 36. P2 — Add policy evaluation harness with counterfactual replay

* `Priority`: `P2`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: replay, counterfactual comparison, historical decision evaluation
* `Why now`: You need evidence that Cherry improves outcomes, not just tests that it behaves as written.
* `Dependencies`: issues `26`, `29`, `33`, and `35`
* `PR Order`: `36`
* `Acceptance Criteria`:

  * historical account state can be replayed safely
  * Cherry decisions can be compared against baseline policies
  * baseline policies are documented
  * metrics include:

    * avoided overdraft risk
    * interest reduction
    * preserved liquidity
    * debt reduction
    * failed/degraded decision rate
  * replay never mutates live state
* `Out of Scope`:

  * public benchmark claims
  * marketing statistics

---

## 37. P2 — Add decision quality metrics and production observability

* `Priority`: `P2`
* `Owner Domain`: `observability`
* `Owner Role`: `infra-owner`
* `Owner Scope`: metrics, traces, decision outcomes, degradation rates, execution outcomes
* `Why now`: Without observability, Cherry cannot distinguish correctness from luck.
* `Dependencies`: issues `26`, `27`, `32`, and `36`
* `PR Order`: `37`
* `Acceptance Criteria`:

  * degradation rate is measured
  * recommendation acceptance rate is measured
  * execution success/failure rate is measured
  * stale-state blocks are measured
  * reconciliation mismatch rate is measured
  * decision outcome metrics are tied to audit ledger records
  * sensitive financial values are redacted from logs
* `Out of Scope`:

  * growth analytics
  * ad tracking
  * behavioral manipulation

---

## 38. P1 — Add privacy, retention, and data deletion policy enforcement

* `Priority`: `P1`
* `Owner Domain`: `security`
* `Owner Role`: `security-owner`
* `Owner Scope`: financial data retention, deletion, export, redaction, logs
* `Why now`: Real financial data changes the threat model. The repo-cleanup issues are not enough.
* `Dependencies`: issues `28`, `29`, and `37`
* `PR Order`: `38`
* `Acceptance Criteria`:

  * financial data classes have retention rules
  * user deletion deletes or anonymizes covered records
  * logs cannot contain raw account numbers, tokens, or transaction payloads
  * exported audit data redacts secrets
  * deletion behavior is tested
  * docs define what is retained and why
* `Out of Scope`:

  * formal compliance certification
  * enterprise governance features

---

## 39. P1 — Threat-model connected-account and execution surfaces

* `Priority`: `P1`
* `Owner Domain`: `security`
* `Owner Role`: `security-owner`
* `Owner Scope`: provider tokens, execution APIs, account linking, webhook trust, replay protection
* `Why now`: Once Cherry connects to financial providers, normal app security is insufficient.
* `Dependencies`: issues `25`, `28`, `29`, `32`, and `38`
* `PR Order`: `39`
* `Acceptance Criteria`:

  * threat model document exists
  * token storage boundary is defined
  * webhook authenticity is verified
  * replay attacks are blocked
  * privilege escalation between users/accounts is tested
  * execution endpoints require strongest authorization boundary
  * high-risk actions are rate-limited
* `Out of Scope`:

  * external pentest
  * SOC2 theater

---

## 40. P2 — Build provider sandbox integration before live execution

* `Priority`: `P2`
* `Owner Domain`: `integrations`
* `Owner Role`: `integrations-owner`
* `Owner Scope`: sandbox provider connection, sandbox balances, sandbox transactions, sandbox execution
* `Why now`: Real execution must be rehearsed somewhere that cannot hurt anyone.
* `Dependencies`: issues `27` through `39`
* `PR Order`: `40`
* `Acceptance Criteria`:

  * sandbox account connection works
  * sandbox transaction ingestion works
  * sandbox balance refresh works
  * sandbox execution attempt works
  * sandbox webhooks update execution state
  * reconciliation works against sandbox-observed state
  * no live provider credentials are required for tests
* `Out of Scope`:

  * live provider rollout
  * production autonomy

---

## 41. P1 — Add live execution behind confirmation-only gate

* `Priority`: `P1`
* `Owner Domain`: `execution`
* `Owner Role`: `execution-owner`
* `Owner Scope`: live confirmed payments/transfers, confirmation UX/API, execution audit
* `Why now`: The first real execution milestone should require human confirmation.
* `Dependencies`: issue `40`
* `PR Order`: `41`
* `Acceptance Criteria`:

  * live execution is impossible without explicit confirmation
  * confirmed action payload is shown before execution
  * action payload cannot mutate after confirmation
  * execution result is persisted
  * unknown result is surfaced as unknown, not failed or succeeded
  * audit ledger links recommendation → confirmation → execution → observed reconciliation
* `Out of Scope`:

  * autonomous execution
  * multi-provider support

---

## 42. P1 — Add autonomous limited execution with strict caps

* `Priority`: `P1`
* `Owner Domain`: `execution`
* `Owner Role`: `execution-owner`
* `Owner Scope`: limited autopilot, action caps, kill switch, escalation policy
* `Why now`: Autonomy should only exist after confirmation-only execution has proven safe.
* `Dependencies`: issues `41`, `37`, and `39`
* `PR Order`: `42`
* `Acceptance Criteria`:

  * autonomous execution is disabled by default
  * user must opt in explicitly
  * dollar caps are enforced
  * action-class caps are enforced
  * stale/degraded/reconciled-unknown state blocks autonomy
  * global kill switch exists
  * user-level kill switch exists
  * autonomous decisions are auditable
* `Out of Scope`:

  * broad autonomy
  * investments
  * loans/refinancing

---

## 43. P2 — Define narrow product vertical and success metric

* `Priority`: `P2`
* `Owner Domain`: `product`
* `Owner Role`: `product-owner`
* `Owner Scope`: initial market slice, primary user, primary decision class, success metric
* `Why now`: “Personal finance AI” is too broad. Broad systems die beautifully.
* `Dependencies`: issues `20` through `24`
* `PR Order`: `43`
* `Acceptance Criteria`:

  * one initial vertical is chosen
  * one primary user problem is chosen
  * one measurable success metric is chosen
  * unsupported product claims are removed
  * roadmap explicitly excludes unrelated finance domains
* `Recommended vertical`:

  * credit-card payoff and liquidity-safe purchase routing
* `Out of Scope`:

  * wealth management
  * investing
  * tax
  * full budgeting suite

---

## 44. P2 — Infer user preferences from transaction history

* `Priority`: `P2`
* `Owner Domain`: `intelligence`
* `Owner Role`: `intelligence-owner`
* `Owner Scope`: transaction classification, merchant memory, preference inference, discretionary pattern detection
* `Why now`: Cherry needs to distinguish financially unsafe spending from spending that is safe but misaligned with the user’s actual habits and priorities.
* `Dependencies`: issues `29`, `35`, `38`, and `39`
* `PR Order`: `44`
* `Acceptance Criteria`:

  * recurring merchants are detected from transaction history
  * discretionary categories are inferred from observed spending
  * user preference weights are derived from behavior, not manually assumed
  * inferred preferences are confidence-scored
  * low-confidence preferences cannot drive hard rejection
  * users can correct inferred preferences
  * corrected preferences override model inference
  * preference inference never overrides hard liquidity, debt, or safety constraints
  * explanations distinguish:

    * unsafe
    * safe but expensive
    * safe but preference-misaligned
    * safe and preference-aligned
* `Out of Scope`:

  * manipulative spending nudges
  * advertising
  * selling transaction data
  * moral judgment about purchases

---

# Current Backlog Gap Map

| Required Capability          |          Covered Now? | Add        |
| ---------------------------- | --------------------: | ---------- |
| truthful solver              |                mostly | 9–14       |
| canonical advisory lifecycle |                   yes | 15–22      |
| live-state UI                |                   yes | 21–22      |
| account connection           |                    no | 28         |
| transaction ingestion        |                    no | 29         |
| stable liability truth       | partial/degraded only | 30         |
| user consent                 |                    no | 25         |
| execution authority          |                    no | 27, 41, 42 |
| auditability                 |                  weak | 26         |
| reversibility/recovery       |                    no | 31         |
| safety guardrails            |               partial | 33         |
| credit-cycle realism         |                    no | 34         |
| recurring cashflow           |                    no | 35         |
| empirical quality proof      |                    no | 36–37      |
| privacy/retention            |                  weak | 38         |
| threat model                 |                  weak | 39         |
| sandbox rollout              |                    no | 40         |
| product focus                |                    no | 43         |

---

