Status: Active
Last updated: 2026-03-13

# Brutal Remediation Backlog

Cherry is a `real core, dishonest shell`.

This document is a convergence contract, not a feature roadmap.
Its job is to force Cherry toward one trustworthy advisory lifecycle and reject work that expands surface area before the core is real.

## Success Condition

The backlog is complete when Cherry can run one advisory lifecycle without legacy code paths, static UI state, or manual-only steps.

The lifecycle proof in Issue 11 is the first product milestone Cherry must satisfy before any new surface expansion is allowed.

## Canonical Lifecycle Slice

```text
merchant scan
   ↓
engine decision (approve / warn / block)
   ↓
session creation
   ↓
user confirmation OR verification
   ↓
ledger mutation
   ↓
live state visible in home shell
```

The lifecycle entry point is the `/api/scan` route.

## Lifecycle Ownership Boundaries

```text
engine-owner
  produces canonical advisory decision

sessions-owner
  manages session creation and state transitions

ledger-owner
  performs deterministic financial mutation

api-owner
  exposes lifecycle through stable route contracts
```

## Session Terminal State

A session is terminal when:

- decision outcome is recorded
- confirmation or verification path has completed
- ledger mutation has occurred or been explicitly rejected
- the resulting state is visible through the home shell read model

## Owner Map

- `simulation -> engine-owner`
- `authority -> authority-owner`
- `sessions -> sessions-owner`
- `ledger -> ledger-owner`
- `api -> api-owner`
- `ui -> frontend-owner`
- `security -> security-owner`
- `infra -> infra-owner`

## Issue Schema

Every issue in this backlog must include:

- `Title`
- `Priority`
- `Owner Domain`
- `Owner Role`
- `Owner Scope`
- `Why now`
- `Dependencies`
- `PR Order`
- `Acceptance Criteria`
- `Out of Scope`

## Sequencing Rule

No `P1` or `P2` work starts until all `P0` items are complete or explicitly waived in this document.

## Convergence Rule

```text
At any point there may be:

1 simulation engine
1 public simulation contract
1 advisory decision path
1 session lifecycle
1 ledger mutation pathway

Any PR introducing a second system in these categories is rejected.
```

## No Expansion Rule

No new user-facing surfaces or feature growth are allowed while deceptive or fake-complete surfaces remain.

## Issues

### 1. P0 — Purge sensitive bank CSVs and replace them with synthetic fixtures

- `Priority`: `P0`
- `Owner Domain`: `security`
- `Owner Role`: `security-owner`
- `Owner Scope`: `data/bank/*`, ingest fixtures, docs that imply real financial fixture data
- `Why now`: Sensitive-looking financial data in the repo is the highest-severity operational risk.
- `Dependencies`: none
- `PR Order`: `1`
- `Acceptance Criteria`:
  - real-looking bank CSVs are removed from tracked repo content
  - synthetic replacements exist for ingest and test paths
  - docs state that only synthetic financial fixtures are allowed
- `Out of Scope`:
  - new ingest features
  - historical data enrichment

### 2. P0 — Eliminate repo-managed live secret files and reduce env surface to documented examples

- `Priority`: `P0`
- `Owner Domain`: `infra`
- `Owner Role`: `infra-owner`
- `Owner Scope`: local `.env*` handling, `.env.example`, environment docs
- `Why now`: Live secret sprawl distorts operational state and creates avoidable disclosure risk.
- `Dependencies`: none
- `PR Order`: `2`
- `Acceptance Criteria`:
  - live secret values are no longer repo-managed workspace state
  - `.env.example` is the only documented env contract file
  - docs explicitly forbid storing live secrets in the workspace
- `Out of Scope`:
  - deploy platform redesign
  - secret manager rollout beyond what is needed to remove repo-managed live values

### 3. P0 — Require explicit operator authorization for destructive admin HTTP routes or remove the HTTP surface

- `Priority`: `P0`
- `Owner Domain`: `security`
- `Owner Role`: `security-owner`
- `Owner Scope`: `app/api/admin/*`, related auth helpers, admin and dev docs
- `Why now`: Current destructive admin posture is too weak even for development use.
- `Dependencies`: none
- `PR Order`: `3`
- `Acceptance Criteria`:
  - destructive routes are removed from HTTP or gated by explicit operator authorization
  - authenticated dev-user access alone is no longer sufficient
  - docs reflect the new boundary
- `Out of Scope`:
  - general admin UX improvements
  - new operator tooling

### 4. P0 — Enforce Vine signature verification in all production paths

- `Priority`: `P0`
- `Owner Domain`: `security`
- `Owner Role`: `security-owner`
- `Owner Scope`: Vine security config, runtime semantics, related docs
- `Why now`: Warn/off downgrade modes are incompatible with a trustworthy production integrity boundary.
- `Dependencies`: none
- `PR Order`: `4`
- `Acceptance Criteria`:
  - production cannot run with `warn` or `off` signature behavior
  - weaker modes are explicitly non-production only
  - failures are structured and observable
- `Out of Scope`:
  - broader Vine feature expansion
  - new hardware integrations

### 5. P0 — Hide or gate deceptive product surfaces that are not backed by live state

- `Priority`: `P0`
- `Owner Domain`: `ui`
- `Owner Role`: `frontend-owner`
- `Owner Scope`: home shell exposure, wallet pass exposure, verification claims, Vine verification claims
- `Why now`: Fake-complete surfaces create product dishonesty and conceal system truth.
- `Dependencies`: none
- `PR Order`: `5`
- `Acceptance Criteria`:
  - static home shell is hidden or demo-only
  - wallet pass remains disabled
  - no product surface implies automated verification exists when it does not
- `Out of Scope`:
  - redesign work
  - adding replacement surfaces before live state exists

### 6. P1 — Define the canonical simulation response contract from solver output

- `Priority`: `P1`
- `Owner Domain`: `simulation`
- `Owner Role`: `engine-owner`
- `Owner Scope`: canonical solver-derived advisory and simulation contract
- `Why now`: Convergence is impossible while public simulation semantics remain ambiguous.
- `Dependencies`: issues `1` through `5`
- `PR Order`: `6`
- `Acceptance Criteria`:
  - one documented response contract exists
  - the canonical response contract is defined in one location
  - the canonical contract lives in a single exported module, for example `lib/contracts/simulation.ts` or equivalent
  - that location becomes the only public type used by simulation and advisory routes
  - downstream routes import the same type rather than redeclaring response shapes
  - it is derived from canonical engine semantics, not legacy mapping
- `Out of Scope`:
  - route rewrites that are not needed to establish the contract
  - new simulation features

### 7. P1 — Decide verification automation truthfully before route convergence

- `Priority`: `P1`
- `Owner Domain`: `sessions`
- `Owner Role`: `sessions-owner`
- `Owner Scope`: verification automation semantics, lifecycle truth, docs and product claims
- `Why now`: The lifecycle cannot converge until verification truth is decided explicitly.
- `Dependencies`: issues `1` through `6`
- `PR Order`: `7`
- `Acceptance Criteria`:
  - the lifecycle explicitly chooses whether verification is automated now or not
  - there is no fake automation state left
  - the chosen lifecycle shape is documented as the canonical path for downstream APIs and UI
- `Out of Scope`:
  - speculative verification channels beyond the chosen immediate truth
  - feature work unrelated to lifecycle correctness

### 8. P1 — Converge /api/scan, /api/simulate, and autopilot preview on the canonical simulation contract

- `Priority`: `P1`
- `Owner Domain`: `api`
- `Owner Role`: `api-owner`
- `Owner Scope`: public advisory and simulation endpoints and shared response semantics
- `Why now`: Route-level divergence will keep recreating parallel systems unless convergence happens at the boundary.
- `Dependencies`: issues `6` and `7`
- `PR Order`: `8`
- `Acceptance Criteria`:
  - these routes stop diverging in output shape
  - legacy-response mapping is reduced rather than expanded
  - docs describe one route-family contract
- `Out of Scope`:
  - new entry routes
  - adding more preview/advisory surfaces

### 9. P1 — Quarantine or delete the legacy simulation engine

- `Priority`: `P1`
- `Owner Domain`: `simulation`
- `Owner Role`: `engine-owner`
- `Owner Scope`: `lib/simulation.ts` and any runtime references
- `Why now`: Keeping archived simulation semantics in runtime truth invites reintroduction of parallel logic.
- `Dependencies`: issue `6`
- `PR Order`: `9`
- `Acceptance Criteria`:
  - archived simulation is removed from runtime truth or deleted
  - no runtime path depends on legacy simulation semantics
  - docs stop presenting two simulation engines as peers
- `Out of Scope`:
  - historical archiving beyond what is needed to remove runtime ambiguity

### 10. P1 — Remove wrapper-only simulation indirection that adds no boundary semantics

- `Priority`: `P1`
- `Owner Domain`: `simulation`
- `Owner Role`: `engine-owner`
- `Owner Scope`: simulation and advisory wrappers that only relay or reshape legacy-compatible output
- `Why now`: Wrapper sprawl makes the architecture look deeper than it is and blocks convergence.
- `Dependencies`: issues `6`, `8`, and `9`
- `PR Order`: `10`
- `Acceptance Criteria`:
  - each remaining adapter has a real boundary purpose
  - wrapper-only indirection is deleted or explicitly justified
- `Out of Scope`:
  - new abstraction layers
  - refactors unrelated to simulation/advisory convergence

### 11. P2 — Complete the canonical advisory lifecycle slice

- `Priority`: `P2`
- `Owner Domain`: `sessions`
- `Owner Role`: `sessions-owner`
- `Owner Scope`: the exact lifecycle defined in this document
- `Why now`: This is the first real product milestone and the proof that Cherry is more than a convincing prototype.
- `Dependencies`: issues `1` through `10` as applicable
- `PR Order`: `11`
- `Acceptance Criteria`:
  - `/api/scan` produces the canonical engine decision
  - that decision creates an advisory session
  - the session reaches terminal state as defined in this document
  - confirmation or verification completes according to issue `7`
  - ledger mutation occurs deterministically
  - the resulting state is visible in the home shell
- `Out of Scope`:
  - new surfaces
  - wallet activation
  - extra lifecycle variants

### 12. P2 — Rebuild the home shell from live state only

- `Priority`: `P2`
- `Owner Domain`: `ui`
- `Owner Role`: `frontend-owner`
- `Owner Scope`: home and dashboard read model
- `Why now`: The home shell must stop lying once the lifecycle slice is real.
- `Dependencies`: issue `11`
- `PR Order`: `12`
- `Acceptance Criteria`:
  - no UI component reads from static fixtures
  - all dashboard metrics originate from session- and ledger-backed live state
  - degraded backend responses surface explicitly
  - static sample metrics do not remain in the production shell
- `Out of Scope`:
  - design polish beyond what is needed to present live state honestly
  - new dashboard surfaces

### 13. P2 — Fix degraded-vs-empty semantics on user-facing routes

- `Priority`: `P2`
- `Owner Domain`: `api`
- `Owner Role`: `api-owner`
- `Owner Scope`: user-facing read endpoints that currently mask failures as empty state
- `Why now`: Broken state and empty state must be distinguishable if the home shell is going to be trustworthy.
- `Dependencies`: issues `11` and `12`
- `PR Order`: `13`
- `Acceptance Criteria`:
  - broken state and empty state are distinguishable
  - degraded responses are explicit and documented
- `Out of Scope`:
  - new read models unrelated to lifecycle visibility

### 14. P3 — Re-run dependency and API analysis with a parser that can generate a credible full import graph

- `Priority`: `P3`
- `Owner Domain`: `infra`
- `Owner Role`: `infra-owner`
- `Owner Scope`: audit and tooling only
- `Why now`: Current dead-code numbers are too weak to justify cleanup.
- `Dependencies`: issues `1` through `13`
- `PR Order`: `14`
- `Acceptance Criteria`:
  - graph edge counts are credible for repo size
  - API extraction is trustworthy enough to support cleanup decisions
  - unreachable-module detection is strong enough to support targeted cleanup
  - no cleanup plan relies on the current weak graph output
- `Out of Scope`:
  - product behavior changes
  - code deletion driven by current weak analysis

### 15. P3 — Perform targeted dead-code cleanup only after the stronger analysis lands

- `Priority`: `P3`
- `Owner Domain`: `api`
- `Owner Role`: `api-owner`
- `Owner Scope`: orphaned and legacy modules proven by improved analysis
- `Why now`: Cleanup is only safe after the import graph is trustworthy.
- `Dependencies`: issue `14`
- `PR Order`: `15`
- `Acceptance Criteria`:
  - deletions are evidence-backed
  - no bulk cleanup is done from the current dead-code numbers
- `Out of Scope`:
  - opportunistic mass deletion
  - cleanup justified by impression rather than evidence

## Review Rule

Every pull request must answer two questions:

1. Does this change move Cherry closer to the canonical lifecycle?
2. Does this change introduce a second system where one must exist?

If the answer to (1) is no or (2) is yes, the PR is rejected.

## Related docs

- `docs/cherry-vision.md`
- `docs/verification-flow.md`
- `docs/dev-route-inventory.md`
- `docs/system-overview.md`
- `workspace_audit.md`
