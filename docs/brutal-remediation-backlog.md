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

## 10. P1 — Align public advisory explanations with actual engine rationale

* `Priority`: `P1`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: public advisory contract, explanation fields, benefit semantics, autopilot explanation language
* `Why now`: Cherry remains dishonest if the public layer explains recommendations using a rationale different from the one the engine actually used.
* `Dependencies`: issues `6` through `9`
* `PR Order`: `10`
* `Acceptance Criteria`:

  * public explanation fields derive from actual decision rationale
  * reward-gap language is not used as a universal explanation when the true driver is runway, debt structure, or constraints
  * unsupported internal action richness is either exposed honestly or removed from the live public path
  * “best card” messaging is not allowed to stand in for broader action reasoning unless the live product intentionally narrows itself to a card recommender
* `Out of Scope`:

  * marketing copy changes
  * UI polish not needed for explanation truth

---

## 11. P1 — Make proof, test, and documentation claims runtime-faithful

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: optimality docs, proof language, runtime-faithful tests, synthetic-vs-live claim boundaries
* `Why now`: The repo currently risks overstating trust by presenting bounded, synthetic, self-consistent proofs in a way that can be over-read as broader validation.
* `Dependencies`: issues `6` through `10`
* `PR Order`: `11`
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

## 12. P1 — Define the canonical simulation response contract from solver output

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: canonical solver-derived advisory and simulation contract
* `Why now`: Convergence is impossible while public simulation semantics remain ambiguous, but that convergence must occur only after live engine semantics are truthful enough to standardize.
* `Dependencies`: issues `1` through `11`
* `PR Order`: `12`
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

## 13. P1 — Decide verification automation truthfully before route convergence

* `Priority`: `P1`
* `Owner Domain`: `sessions`
* `Owner Role`: `sessions-owner`
* `Owner Scope`: verification automation semantics, lifecycle truth, session state machine, docs and product claims
* `Why now`: The lifecycle cannot converge until Cherry explicitly decides whether verification is automated now, confirmation-only now, or partially manual now.
* `Dependencies`: issues `1` through `12`
* `PR Order`: `13`
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

## 14. P1 — Converge `/api/scan`, `/api/simulate`, and autopilot preview on the canonical simulation contract

* `Priority`: `P1`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: public advisory and simulation endpoints and shared response semantics
* `Why now`: Route-level divergence will keep recreating parallel systems unless convergence happens at the API boundary.
* `Dependencies`: issues `12` and `13`
* `PR Order`: `14`
* `Acceptance Criteria`:

  * these routes stop diverging in output shape
  * legacy-response mapping is reduced rather than expanded
  * public advisory output does not collapse richer internal semantics into contradictory wrapper semantics
  * docs describe one route-family contract
* `Out of Scope`:

  * new entry routes
  * adding more preview or advisory surfaces

---

## 15. P1 — Quarantine or delete the legacy simulation engine

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: `lib/simulation.ts` and any runtime references
* `Why now`: Keeping archived simulation semantics in runtime truth invites reintroduction of parallel logic.
* `Dependencies`: issue `12`
* `PR Order`: `15`
* `Acceptance Criteria`:

  * archived simulation is removed from runtime truth or deleted
  * no runtime path depends on legacy simulation semantics
  * docs stop presenting two simulation engines as peers
* `Out of Scope`:

  * historical archiving beyond what is needed to remove runtime ambiguity

---

## 16. P1 — Remove wrapper-only simulation indirection that adds no boundary semantics

* `Priority`: `P1`
* `Owner Domain`: `simulation`
* `Owner Role`: `engine-owner`
* `Owner Scope`: simulation and advisory wrappers that only relay or reshape legacy-compatible output
* `Why now`: Wrapper sprawl makes the architecture look deeper than it is and blocks convergence.
* `Dependencies`: issues `12`, `14`, and `15`
* `PR Order`: `16`
* `Acceptance Criteria`:

  * each remaining adapter has a real boundary purpose
  * wrapper-only indirection is deleted or explicitly justified
  * wrapper layers are not allowed to exist purely to preserve fake compatibility with obsolete semantics
* `Out of Scope`:

  * new abstraction layers
  * refactors unrelated to simulation or advisory convergence

---

## 17. P2 — Complete the canonical advisory lifecycle slice

* `Priority`: `P2`
* `Owner Domain`: `sessions`
* `Owner Role`: `sessions-owner`
* `Owner Scope`: the exact lifecycle defined in this document
* `Why now`: This is the first real product milestone and the first proof that Cherry is more than a convincing prototype.
* `Dependencies`: issues `1` through `16` as applicable
* `PR Order`: `17`
* `Acceptance Criteria`:

  * `/api/scan` produces the canonical engine decision
  * that decision creates an advisory session
  * the session reaches terminal state as defined in this document
  * confirmation or verification completes according to issue `13`
  * ledger mutation occurs deterministically
  * the resulting state is visible in the home shell
  * no legacy mapping is required in the canonical lifecycle path
  * degraded and broken states are not silently rewritten into empty success-looking responses
* `Out of Scope`:

  * new surfaces
  * wallet activation
  * extra lifecycle variants

---

## 18. P2 — Rebuild the home shell from live state only

* `Priority`: `P2`
* `Owner Domain`: `ui`
* `Owner Role`: `frontend-owner`
* `Owner Scope`: home and dashboard read model
* `Why now`: The home shell must stop lying once the lifecycle slice is real.
* `Dependencies`: issue `17`
* `PR Order`: `18`
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

## 19. P2 — Fix degraded-vs-empty semantics on user-facing routes

* `Priority`: `P2`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: user-facing read endpoints that currently mask failures as empty state
* `Why now`: Broken state and empty state must be distinguishable if the home shell is going to be trustworthy.
* `Dependencies`: issues `17` and `18`
* `PR Order`: `19`
* `Acceptance Criteria`:

  * broken state and empty state are distinguishable
  * degraded responses are explicit and documented
  * routes do not silently convert missing engine prerequisites into success-looking emptiness
* `Out of Scope`:

  * new read models unrelated to lifecycle visibility

---

## 20. P3 — Re-run dependency and API analysis with a parser that can generate a credible full import graph

* `Priority`: `P3`
* `Owner Domain`: `infra`
* `Owner Role`: `infra-owner`
* `Owner Scope`: audit and tooling only
* `Why now`: Current dead-code numbers are too weak to justify cleanup.
* `Dependencies`: issues `1` through `19`
* `PR Order`: `20`
* `Acceptance Criteria`:

  * graph edge counts are credible for repo size
  * API extraction is trustworthy enough to support cleanup decisions
  * unreachable-module detection is strong enough to support targeted cleanup
  * no cleanup plan relies on the current weak graph output
* `Out of Scope`:

  * product behavior changes
  * code deletion driven by current weak analysis

---

## 21. P3 — Perform targeted dead-code cleanup only after the stronger analysis lands

* `Priority`: `P3`
* `Owner Domain`: `api`
* `Owner Role`: `api-owner`
* `Owner Scope`: orphaned and legacy modules proven by improved analysis
* `Why now`: Cleanup is only safe after the import graph is trustworthy.
* `Dependencies`: issue `20`
* `PR Order`: `21`
* `Acceptance Criteria`:

  * deletions are evidence-backed
  * no bulk cleanup is done from the current dead-code numbers
  * cleanup does not reintroduce hidden second systems through archive leftovers or shadow utility paths
* `Out of Scope`:

  * opportunistic mass deletion
  * cleanup justified by impression rather than evidence
