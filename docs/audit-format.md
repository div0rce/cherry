Status: Active
Last updated: 2026-01-03

# Cherry Audit Format (agents)

Canonical spec for writing future audit entries in `AUDIT.md`.

## Current behavior (enforced / in code)
- `AUDIT.md` entries must follow this schema and section order.

## 0. JSON header (required for every new audit entry)

Each audit section MUST start with a JSON code block:

```json
{
  "audit_type": "repository_completion",
  "audit_version": 2,
  "date": "YYYY-MM-DD",
  "git": {
    "branch": "main",
    "commit": "<short-sha>",
    "dirty": false
  },
  "completion": {
    "beta": 66,
    "v1": 66
  },
  "subsystems": {
    "core_engine": 69,
    "api_layer": 75,
    "data_ingestion_modeling": 60,
    "user_web_ui": 68,
    "dev_console_admin": 69,
    "cherry_pass": 50,
    "cherry_vine": 58,
    "security_ops": 56,
    "docs_product_identity": 84
  }
}
```

Use the latest scores for that audit; keep keys stable. JSON uses snake_case.

## 1. Section order

1. JSON header (above)
2. Summary + subsystem table
3. Evidence and Observations (with scoring rationales)
4. Highest-Leverage Next Steps
5. Risk Register (see below)
6. Handoff Notes for Next Agent
7. Open Questions for Human

## 2. Delta section (mandatory)

Include `### 1.b Delta since previous audit` that:
- Finds the prior audit in `AUDIT.md`.
- Shows a table: Subsystem | Prev (%) | Now (%) | Δ | Notes.
- Bullets for any |Δ| ≥ 5 or added/removed subsystems.

## 3. Risk Register

`### 5. Risk Register` must contain:
- Table: ID | Title | Subsystem | Likelihood (LOW/MEDIUM/HIGH) | Impact (LOW/MEDIUM/HIGH/CRITICAL) | Status (OPEN/MITIGATING/CLOSED/ACCEPTED) | Notes.
- At least 5 rows covering: security/ops, data integrity, legal/identity, engine quality, UX/behavioral risks.
- Stable IDs like `SEC_RATE_LIMIT`, `ENG_DEBT_MODEL`, `VINE_SIGS`.

## 4. Handoff & Questions

- `### 6. Handoff Notes for Next Agent`: 3–10 bullets prefixed with `[CONTEXT]`, `[GOTCHA]`, or `[WORKFLOW]`.
- `### 7. Open Questions for Human`: 3–10 direct questions for the maintainer.

## 5. Subsystem key mapping

- `core_engine` ↔ “Core Engine”
- `api_layer` ↔ “API Layer / Backend Routes”
- `data_ingestion_modeling` ↔ “Data Ingestion & Modeling”
- `user_web_ui` ↔ “User-facing Web UI”
- `dev_console_admin` ↔ “Dev Console / Admin Tools”
- `cherry_pass` ↔ “Cherry Pass / Pre-Swipe”
- `cherry_vine` ↔ “Cherry Vine”
- `security_ops` ↔ “Security, Reliability, Ops”
- `docs_product_identity` ↔ “Documentation & Product Identity”

JSON uses keys; tables/headings use labels. Update both if you add/remove subsystems.

## 6. Scoring rationales

For each subsystem in `### 3. Evidence and Observations`:
- Provide ≥3 bullets.
- Each bullet references specific files/modules and tags the maturity judgment (HIGH/MEDIUM/LOW).
- Example: `lib/engine/solver.ts` integrates candidate generation, simulation, scoring but still calls legacy mapper → MEDIUM maturity (core present, migration incomplete).

## 7. Behavioral guidelines

- Be conservative; credit only what’s on `main`.
- If evidence is missing, say so in the Evidence section.
- Do not change weights or subsystems without updating the JSON example, mapping, and noting the change in the next Delta section.

## Audit Mindset (for agents)

Cherry audits are not just snapshots. They exist so a different LLM (or human) can safely pick up the repo later and know:

- What is real vs prototype.
- What changed since last time.
- What is risky vs boringly safe.
- What the next few sprints should actually do.

When you run an audit, adopt this mindset:

1. **Diff-first, then scan**
   - Before reading everything, inspect what changed since the last audit:
     - `git log --oneline` between the two audit commits.
     - `git diff <prev-audit-commit>...HEAD` focusing on `app/`, `lib/`, `prisma/`, `docs/`.
   - Use this to target your attention. Do not re-describe subsystems that did not change except in the Delta table.

2. **Product loop first, features second**
   - Think in terms of the core loop: **Observe → Evaluate → Recommend → Verify → Reflect**.
   - Map each change to where it lands in the loop:
     - Observe = ingest / Vine / bank / pass.
     - Evaluate = engine, guardrails, scoring.
     - Recommend = scan/session surfaces, API responses.
     - Verify = verification, ledger, receipts/bank signals.
     - Reflect = statements/history, points, feedback into budgets.
   - When scoring and writing evidence, always say which stage of the loop a change affects.

3. **Be risk-biased, not feature-biased**
   - Adding new screens or endpoints is less important than:
     - Removing legacy paths.
     - Tightening guardrails.
     - Reducing “magic” behavior.
   - When in doubt, lower scores if:
     - There is no test coverage.
     - There is a silent failure path.
     - A critical flow depends on manual conventions.

4. **Assume the human is the product brain, not the infra expert**
   - Explain tradeoffs in language a product person can use:
     - “If we ship like this, X can happen” rather than “module Y is messy”.
   - Prefer statements of the form:
     - “If Cherry is used by 1000 strangers, this subsystem will break in these ways: …”

## Longitudinal Consistency Rules (for agents)

Your job is to make audits comparable over time.

1. **Risk IDs are stable**
   - Never rename an existing `ID` in the Risk Register.
   - If a risk is resolved, keep the row but change:
     - `Status` to `CLOSED` or `ACCEPTED`.
     - `Notes` to explain what changed (file paths, commit hash if known).
   - New risks get new IDs; do not recycle old ones.

2. **Subsystem scores should move slowly**
   - Changes ≥ 5 points on a subsystem must:
     - Be linked to specific commits, files, and tests.
     - Be explained clearly in `### 1.b Delta since previous audit`.
   - If you can’t justify a ≥ 5 move with concrete code/docs evidence, do not move it.

3. **Completion_beta vs Completion_v1**
   - `completion_beta` can move on smaller changes (internal tools, flows).
   - `completion_v1` should not move unless:
     - Risk register shows important risks moving to MITIGATING/CLOSED.
     - Real-world ingest / verification / security posture improves.
   - Always explain why the two numbers did or did not diverge.

## Evidence Quality & Uncertainty (for agents)

You must distinguish between what you know and what you are guessing.

1. **Mark weak evidence explicitly**
   - When you’re not sure (e.g., feature hidden behind flags, unclear dead code), say so in the Evidence section:
     - “Appears unused; no references from `app/api/*` (LOW confidence).”
   - Do not assign high scores based on speculative behavior.

2. **Prioritize observed behavior over intent**
   - If docs promise a behavior but code does not enforce it:
     - Score based on code, not docs.
     - Note the mismatch in `### 3. Evidence and Observations` and/or Risk Register.
   - Never assign maturity or score increases based solely on documentation, comments, flags, or TODOs; only observed behavior on `main` counts.

3. **Call out blind spots**
   - If you did not inspect a plausible area (e.g., mobile client, external service), note:
     - “Not inspected: <area>. Scores do not reflect its state.”
   - Do not implicitly assume external systems are safe or complete.

## Turning Findings into Sprints (for agents)

Highest-Leverage Next Steps must be usable as sprints, not just vibes.

For each item in `### 4. Highest-Leverage Next Steps`:

1. Ensure it can be turned into a GitHub issue or sprint goal:
   - Clear scope (files, surfaces, APIs).
   - Clear “done” condition (tests, docs, behavior).

2. Add a one-line **Cost/Benefit** estimation:
   - Example:
     - “Cost: ~1–2 focused days.”
     - “Cost: multi-sprint refactor, should be broken down.”

3. Tag each item with the affected loop stage:
   - `[OBSERVE]`, `[EVALUATE]`, `[RECOMMEND]`, `[VERIFY]`, `[REFLECT]`, `[INFRA]`.
   - Example: `[VERIFY][INFRA] Wire webhook → verification signal → ledger auto-posting …`

4. Prefer fewer, heavier items over many small ones:
   - 5–7 items is ideal.
   - Each item should move at least one subsystem ≥ 2–3 points if fully completed.

## Future/Target behavior (explicitly speculative)
- If the audit schema evolves, update this file and `AUDIT.md` together.

## Related docs
- `AUDIT.md`
- `docs/system-overview.md`

## Cherry Mental Model Primer (for agents)

Before scoring or suggesting work, align to this mental model:

1. **Cherry is advisory only**
   - It never fronts payments.
   - It should behave like a copilot sitting next to the card, not a new card.

2. **The “user story” you should optimize**
   - A real person:
     - Signs in.
     - (Eventually) links real accounts/cards.
     - Gets advice before paying (scan / Vine / pass).
     - Actually makes a decision based on that advice.
     - Later sees the impact in:
       - Buckets/budgets.
       - Statements/history.
       - Points/rewards.
   - When evaluating features, always ask:
     - “Does this make that story real, safer, or more boringly reliable?”

3. **Prototype vs product**
   - Anything that only works with seeded data is a **lab tool**, not a user feature.
   - Treat lab-only flows as helpful for beta but not as v1-complete.

## Human Interaction & Style (for agents)

The maintainer (Moustafa) is:

- The product brain.
- An indie dev.
- Not interested in fluff.

When you write audits:

1. **Be terse and explicit**
   - Avoid marketing language.
   - Prefer:
     - “X is unsafe because Y” over “X might be improved.”

2. **Surface hard truths early**
   - In `### 1. Summary`, include one blunt line:
     - “Main blockers to real users: <list of 2–3 systemic issues>.”

3. **Ask sharp, binary questions**
   - In `### 7. Open Questions for Human`, avoid vague questions.
   - Prefer yes/no or “pick one” questions:
     - “Do you want Vine to be required for any v1 cohort? (yes/no)”
     - “Should we prioritize real ingest before pass/Vine, or the reverse?”
