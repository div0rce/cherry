Version: doctrine_v1
Status: Active
Last updated: 2026-01-29

# Cherry Zero-Competition Hardening Doctrine

## 0) Prime Directive

1. No silent semantics drift.
   Any change that can affect:
   - ordering
   - admissibility
   - accounting
   - candidate space
   requires:
   - explicit version bump (engine / input / policy as appropriate)
   - explicit freeze baseline bump
   - isolation in its own commit

2. Extinct bug classes, don’t patch symptoms.
   Every failure must end with:
   - a structural prohibition (type / guardrail / environment boundary)
   - a regression test
   - a CI-enforced invariant

3. Boundaries are law.
   - Runtime code may not leak into guardrails.
   - Guardrail code may not leak into runtime/tests.
   - Docs may not reference implementation paths.

## 1) Engine Boundary Doctrine (EngineInput)

### 1.1 Canonical EngineInput contract

- EngineInput exists only at:
  lib/engine/input/EngineInput.ts
- It must include:
  __version: typeof engineInputVersion
- It must be:
  - time-free
  - DB-free
  - label-free
  - fully serializable
  - deterministic

### 1.2 Allowed flow

legacy state/context
  -> fromLegacy (quarantine; time + DB allowed)
  -> EngineInput (frozen, versioned)
  -> validateEngineInput (total, pure)
  -> solver (pure)

### 1.3 Extinction rules

- No optional semantics. If a field influences ordering, it cannot be nullable without a total normalization rule.
- No derived duplication. Derived fields are computed post-boundary.

## 2) Environment Separation

### 2.1 Hard rule

Guardrail environment may not import runtime modules. Ever.

Implication:
- Guardrails must not import from lib/**.
- If a guardrail needs runtime metadata (e.g. engineInputVersion), it must:
  - read source text
  - parse with regex or TS AST
  - validate structure

### 2.2 Tests environment rule

Tests/node may import only env:node + runtime, never env:guardrail.
If tests need shared helpers, duplicate minimal versions or move helpers to an env-neutral module
explicitly assigned in the environment contract.

## 3) TypeScript Sharp-Edges

### 3.1 noUncheckedIndexedAccess / TS18048

Rule: Never use arr[i] in boundary code.
Use:
- for (const [i, x] of arr.entries()) {}

Enforced by: check:engine-input-boundary

### 3.2 exactOptionalPropertyTypes

Rule: Never pass undefined to optional properties; omit the property instead.
Pattern:
- const opts: SolveDecisionOptions = { ...base };
- if (weights !== null) opts.weights = weights;

### 3.3 TS4111 (index signatures)

If TS says “must be accessed with ['x']”, do it, then eliminate the construct if it violates other guardrails.

## 4) Boolean Explicitness (silent default ban)

No implicit boolean intent. No if(x) on non-boolean. No !value. No ??.
Use explicit comparisons:
- if (value === undefined || value.length === 0) { ... }

## 5) Guardrail System Doctrine

### 5.1 Docs rule

Docs may reference only guardrail names:
- check:engine-freeze
- not scripts/check-engine-freeze.mts

### 5.2 Registry parity rule

Any change to registry must be accompanied by:
- package.json script entry
- docs/guardrails.md update
- docs/config-snapshot.md sync

### 5.3 Execution rule

Guardrails are executed only via:
- npm run check:<name>

## 6) Freeze discipline

### 6.1 When freeze trips

- Stop.
- Decide:
  - revert accidental drift
  - or bump baseline with justification

### 6.2 Baseline bump commit rule

Baseline bump is always its own commit:
- chore(engine-freeze): bump baseline after <reason>

## 7) Test doctrine

### 7.1 EngineState stubs must include full EngineInput-required slices

If fromLegacy reads state.preferences.profileId, every test stub state must include:
- preferences: { profileId: 'BALANCED', customWeights: null }

### 7.2 Legacy engine must be mockable

If endpoints optionally call legacy engine providers, tests must stub them deterministically.

### 7.3 Parsing doctrine

- Prefer schema validation (Zod).
- If using JSON parsing, it must be typed and safe (no any propagation).
- Schemas must be .strict().

## 8) Commit discipline

One concern per commit:
- engine: runtime semantics only
- guardrails: scripts/registry only
- docs: docs only
- tests: tests only
- chore(engine-freeze): baseline bumps only

Squashing is allowed only within the same concern category.
Never squash engine + guardrails + baseline.

## 9) Operational rule

Doctrine acknowledgement is incomplete unless it includes:
- doctrine file exists
- guardrails registered
- guardrails pass
- npm run check passes

## 10) Addendum: Mandatory execution hooks

### 10.1 Definition of done for any change

1. git status --short is empty
2. npm run check passes
3. npm run check:guardrails passes twice (second run catches nondeterministic flakes)
4. git log -n <N> --pretty=%B shows commit messages obeying commit taxonomy
5. If any freeze baseline bumped: commit message includes the cause, and baseline bump is isolated

Exit criteria: npm run check green + clean tree

### 10.2 Auto-triage protocol when a guardrail fails

Output exactly:
- failing guardrail name
- failing file:line
- classification:
  - engine semantics
  - boundary hygiene
  - guardrail env leak
  - docs/registry drift
  - tests stub incompleteness
- action plan:
  - minimal patch
  - regression test
  - guardrail/invariant that prevents recurrence

No “how do you want me to proceed” unless there are two truly valid interpretations.

### 10.3 Change isolation protocol

Before every commit, the agent must:
- print git diff --name-only --cached
- prove files match the commit category:
  - engine: only lib/engine/**
  - guardrails: only scripts/** + package.json
  - docs: only docs/**
  - tests: only tests/**
  - chore(engine-freeze): only scripts/guardrails/engine-freeze.policy.json

If mismatch: unstage and redo.

### 10.4 Boundary invariants

- fromLegacy never throws (it normalizes)
- validateEngineInput never throws (it reports)
- engine entrypoints reject invalid EngineInput deterministically (error class stable)
- guardrails never import runtime modules
- tests never import guardrail modules

If any invariant is violated, fix takes priority over feature work.

### 10.5 Minimal acknowledgement template

- Acknowledged doctrine vX
- Active invariants: list 3–6
- Next action: one line
- Exit criteria: npm run check green + clean tree

### 10.6 Stand-by response ban

If the user provides a concrete failure log or diff, the agent must propose and apply the minimal
patch that restores npm run check green, without asking for permission.
