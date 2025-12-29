Status: Draft
Last updated: 2025-12-29

## Guardrails & Script Hygiene — Fixed-Point Migration (P0, Blocking)

### Status

* Current state: **Migration incomplete**
* Risk: **CI will fail despite correct architecture**
* Cause: **Runtime-grade strictness applied before scripts were refactored**

---

### Goal (Non-negotiable)

Reach a fixed point where **all** of the following pass with zero warnings:

```
npm run check
npm run lint -- --max-warnings=0
npm run lint:scripts
npm run typecheck
npm run typecheck:scripts
npm test
npm run build
```

No allowlists. No exceptions. No TODOs.

---

### Phase 1 — Make the rules explicit (so it errors next time)

* [ ] Add guardrail: `check:scripts-must-be-strict`
* [ ] Scope: `scripts/**/*.mts`
* [ ] Enforce:

  * no `any`
  * no `JSON.parse`
  * no implicit booleans
  * no untyped `catch`
  * no `console.log`
* [ ] Failure format **must** be:

```
SCRIPT_HYGIENE_VIOLATION
Script: <file>
Rule: <rule>
Fix: <exact fix>
```

**Outcome:** future violations fail immediately and loudly.

---

### Phase 2 — Mechanical cleanup (mandatory, boring, correct)

* [ ] Replace all `JSON.parse` → `readJson(path, Schema)`
* [ ] Replace `any` → `unknown` + explicit narrowing or Zod inference
* [ ] Fix all `catch` blocks:

```ts
catch (err: unknown) {
  const e = asError(err)
  fail(...)
}
```

* [ ] Replace `console.log` → `fail()` or approved stdout write
* [ ] Remove unused variables (or prefix with `_`)
* [ ] Replace all implicit boolean checks with explicit comparisons

**Outcome:** scripts obey their own guardrails.

---

### Phase 3 — Guardrails must obey guardrails

* [ ] Enforce that **all guardrail scripts** pass:

  * `lint:scripts`
  * `typecheck:scripts`
* [ ] No `eslint-disable` allowed in scripts
* [ ] Add guardrail: `check:guardrail-script-lint`

**Outcome:** no meta-exceptions, no self-violations.

---

### Phase 4 — Lock the fixed point (extinction step)

* [ ] Update `docs/guardrails.md`:

  * Any new script must pass `lint:scripts` and `typecheck:scripts`
* [ ] Update CI to run explicitly:

  * `npm run lint:scripts`
  * `npm run typecheck:scripts`
* [ ] Add guardrail asserting CI runs both **directly**, not transitively

**Outcome:** this bug class cannot reappear.

---

### Definition of Done (Bug Class Extinct)

* `npm run check` is the single correctness entrypoint
* Scripts contain:

  * no `any`
  * no `JSON.parse`
  * no implicit booleans
  * no untyped catches
  * no console logging
* Guardrails are idempotent and self-consistent
* Registry is the only source of truth
* CI failures are local, actionable, and deterministic

---

## Metadata

* Priority: **P0**
* Category: **Infrastructure / Correctness**
* Blocking: **Yes — blocks new development**

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
