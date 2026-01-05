Status: Active
Last updated: 2026-01-03

# Authority v1 (advisory-only, deterministic)

Cherry’s authority layer is a pure, replayable simulator that answers: **“Given this hypothetical spend, how strongly should Cherry discourage it — and why?”** It never approves/declines, never mutates state, and is advisory-only.

Aligns with: `docs/legal-constraints.md` (no payments), `docs/cherry-vision.md` (copilot), `docs/wallet-pass.md` (501 gate), and engine invariants.

---

## Current behavior (enforced / in code)
- Authority is deterministic and pure; same inputs yield the same verdicts and inputsVersion.
- `simulateSpendAuthority` runs in `/api/scan`, `/api/simulate`, `/api/vine/order`, and Autopilot preview/commit.
- `DecisionEvent` rows are logged only when authority returns `ok: true`.
- The spec is frozen for `authority_v1`; semantic changes require a new version.

## Inputs
- `userId` (string, required)
- `amountCents` (int, ≥ 0; `0` denotes a snapshot/no-spend evaluation)
- `category` (RewardCategory)
- `surface` (`autopilot | vine | simulate | scan`)
- `counterfactuals?`: array of `{ amountCents?, delayDays?, bucketId? }` (optional). Defaults: 20% amount reduction, 3-day delay.

Derived (read-only):
- Latest `DailyState` (status, safeToSpendCents, inputsVersion)
- Bucket runtime (rolled via `applyInMemoryRollover` → `toBucketRuntime`)
- Category preference
- Pending verification: `RecommendationSession.verificationStatus=PENDING` count
- Pending points: `CherryPointLedger.status=PENDING` sum
- Deterministic `inputsVersion` hash over all inputs + counterfactual requests

No writes, no side effects.

---

## Outputs (type: `SimulatedAuthorityDecision`)
- `version`: `'authority_v1'`
- `verdict`: `ALLOW_SIMULATED | WARN_SIMULATED | FLAG_SIMULATED`
- `severity`: integer lattice (max of reasons)
  - `3`: hard flag
  - `1–2`: warning
  - `0`: allow
- `reasons`: non-empty array of `{ code: AuthorityReason, severity, detail }`
  - `AuthorityReason` (finite): `DAILY_STATE_RISKY`, `BUCKET_EXHAUSTED`, `ESSENTIAL_BUFFER_LOW`, `CATEGORY_RESTRICTED`, `VERIFICATION_PENDING`, `AMOUNT_SPIKE`
  - Severity map (deterministic):
    - `CATEGORY_RESTRICTED`: 3
    - `BUCKET_EXHAUSTED`: 3
    - `DAILY_STATE_RISKY`: 2 (tight/risky), 0 when steady (fallback detail)
    - `ESSENTIAL_BUFFER_LOW`: 2
    - `VERIFICATION_PENDING`: 1
    - `AMOUNT_SPIKE`: 1
- `explanation`: top reason detail (deterministic)
- `inputsVersion`: sha256 hash of inputs + counterfactual requests
- `engineVersion`: commit/version env or `null`
- `counterfactuals`: array of `{ adjustment, verdict, severity, reasons, explanation }`

Verdict rule (severity lattice):
- `severity >= 3` ⇒ `FLAG_SIMULATED`
- `1–2` ⇒ `WARN_SIMULATED`
- `0` ⇒ `ALLOW_SIMULATED`

---

## Invariants
- Pure/deterministic: same inputs → identical outputs + inputsVersion.
- Advisory only: no bucket/session/ledger mutations; no auth/routing semantics; no approval/decline language.
- Authority outputs must never be used to gate, block, auto-expire, or otherwise alter control flow; they affect presentation and advisory messaging only.
- Reasons are exhaustive and finite; no free-form codes.
- `reasons` is non-empty; severity is the max of reasons.
- `DecisionEvent` is written once per `ok: true` invocation (see below).
- Counterfactuals use the same evaluation pipeline and determinism rules.

---

## Persistence (DecisionEvent ledger)
- Table: `DecisionEvent`
- Columns: `id`, `userId`, `surface`, `amountCents`, `category`, `verdict`, `reasonCode` (top), `reasonCodes` (array JSON), `severity`, `inputsVersion`, `counterfactuals` (JSON), `createdAt`
- Rule: every `simulateSpendAuthority` call that returns `ok: true` writes exactly one `DecisionEvent`; fallback/blocked results do not write; no retries/dedup.

---

## Language contract (allowed verbs)
- Use: **simulate, evaluate, recommend, flag, warn**
- Do NOT use: approve, decline, block, route (except as simulated labels)
- Always surface as advisory/sandbox; never imply fund movement or payment routing.

## TODO — Phase 3: Offline Learning & Policy Evaluation

Status: Deferred  
Depends on: Phase 2 ledger guarantees

Purpose:
- Enable offline analysis and policy iteration using historical DecisionEvents.
- Never affect live authority behavior.
- Never mutate user state or spending power.

Planned work:
- [ ] Offline evaluators that consume DecisionEvent + inputsVersion snapshots
- [ ] Counterfactual policy scoring (would-have-been-better analysis)
- [ ] Rule fire-rate and severity distribution analysis
- [ ] Dataset extraction for research / tuning only

Hard constraints:
- No feedback loop into authority_v1
- No live re-weighting or auto-tuning
- No enforcement logic
- Results are advisory and retrospective only

Notes:
- Any live influence requires authority_v2 and explicit user opt-in.

---

## Counterfactuals (v1)
- Optional `counterfactuals` input lets callers test “what-if” adjustments (amount, delay, bucket override).
- Default set (when none provided): `{ amountCents: amount * 0.8 }`, `{ delayDays: 3 }`.
- Each counterfactual emits the full authority decision shape (verdict/severity/reasons/explanation).
- No side effects; same inputsVersion discipline (requests are included in the hash).

---

## Surfaces consuming authority_v1
- `/api/scan`, `/api/simulate`, `/api/autopilot/preview`, `/api/autopilot/commit`, `/api/vine/order` return `authority` alongside legacy decision payloads.
- UI must render the provided verdict/reasons/counterfactuals verbatim; no local inference or thresholds.

## Future/Target behavior (explicitly speculative)
- `authority_v2` may introduce new reason codes and scoring rules; no changes to `authority_v1` without a version bump.

## Related docs
- `docs/legal-constraints.md`
- `docs/cherry-vision.md`
- `docs/api.md`
- `docs/decision-event-ledger.md`
