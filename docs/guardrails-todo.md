Status: Draft
Last updated: 2025-12-29

## Guardrails Fixed-Point Convergence (Blocking)

### 1. Script Substrate Unification (P0)

* [ ] Create canonical helpers under `scripts/guardrails/lib/`:

  * `fail.mts`
  * `as-error.mts`
  * `read-json.mts`
  * `import-typed.mts`
  * `env.mts`
* [ ] Ban in all scripts:

  * `JSON.parse`
  * `console.log`
  * `process.exit`
  * ad-hoc error shapes
* [ ] Enforce via ESLint + guardrail: `check:script-substrate`
* [ ] Migrate **all existing scripts** to the substrate

**Exit criteria:** zero violations, zero allowlists

---

### 2. Bootstrap → Steady-State Transition (P0)

* [ ] Introduce `scripts/guardrails/allowlists/bootstrap.allowlist.json`
* [ ] Require:

  * explicit reason
  * expiration date
* [ ] Add guardrail: `check:bootstrap-expiry`
* [ ] Burn down allowlist to empty
* [ ] Enforce empty allowlist in CI

**Exit criteria:** bootstrap allowlist removed or empty forever

---

### 3. Guardrail Idempotence (P0)

* [ ] Add `check:guardrail-idempotence`

  * runs `npm run check:guardrails` twice
  * asserts identical failures, order, messages
* [ ] Fail CI on any non-idempotence

**Exit criteria:** deterministic, repeatable guardrail output

---

### 4. Registry as Sole Source of Truth (P0)

* [ ] Treat `scripts/guardrails/registry.mts` as canonical
* [ ] Enforce bijection:

  * registry ↔ filesystem
  * registry ↔ package.json
  * registry ↔ docs
  * registry ↔ CI coverage
* [ ] Zero manual wiring allowed

**Exit criteria:** adding a guardrail requires editing **one file**

---

### 5. Failure Visibility & CI Contract (P0)

* [ ] Standardize failure format:

  * guardrail name
  * file + line
  * violated invariant
  * suggested fix
  * repro command
* [ ] Single summary line at end of failures
* [ ] CI must run **only** `npm run check`
* [ ] Guardrail enforces this invariant

**Exit criteria:** CI failures are obvious, local, and actionable

---

### 6. Extinction Definition (Read-only, Do Not Edit)

Guardrail bug class is considered **extinct** when:

* `npm run check` is the only correctness entrypoint
* No script uses `any`, `JSON.parse`, `console.log`, or custom exits
* Guardrails are idempotent
* Registry is the single authority
* No bootstrap allowlists exist
* Adding guardrails is mechanical and safe

---

## Metadata

* Priority: **P0**
* Category: **Infrastructure / Correctness**
* Blocking: **Yes — blocks new engine or product work**

## Registry Hardening TODOs

- [ ] Enforce alphabetical ordering of GUARDRAILS (deterministic diffs)
- [ ] Snapshot GUARDRAIL_NAMES in test to detect reorder drift
- [ ] Forbid string interpolation in registry values entirely
- [ ] Auto-generate guardrail docs from registry metadata
- [ ] Add `check:guardrail-changelog` to require rationale for additions
- [ ] Add `check:guardrail-removal` to forbid deletion without tombstone
