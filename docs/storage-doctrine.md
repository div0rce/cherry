Status: Active
Last updated: 2026-01-31

# Storage Doctrine

## Current

### Artifact classes and allowed locations

| Class           | Location                        | Rule                 |
| --------------- | ------------------------------- | -------------------- |
| Temp            | `CHERRY_TMP_ROOT` buckets       | bounded, owned       |
| Replay staging  | `tests/replay/_staging/`         | never committed      |
| Replay objects  | `tests/replay/objects/`          | content-addressed    |
| Replay index    | `tests/replay/index/`            | hash references only |
| Build output    | `.next/`, `dist/`                | size-capped          |
| Caches          | `$HOME/.npm`, `$HOME/.cache`     | bounded              |

Writing outside these locations is a correctness failure.

### Temp ownership and isolation

- `CHERRY_TMP_ROOT` is required for all temp writes.
- OS temp roots are forbidden (`/var/folders`, `/private/var`, `/tmp`).
- All scripts must resolve temp roots explicitly.

Enforcement: `check:tmp-root-shape`, `check:temp-quota`.

### Temp quota and failure behavior

- Temp usage is measured, not inferred.
- Quota failures are deterministic and early, not emergent.

Enforcement: `check:temp-quota`, `check:artifact-size-budgets`.

### Replay staging and replay object store

- Staging artifacts must never be committed.
- Replay payloads are content-addressed objects; indexes reference hashes only.

Enforcement: `check:replay-staging-empty`, `check:replay-object-store`.

### Failure modes (expected and handled)

- ENOSPC during guardrails or checks
- tsx IPC temp creation failures
- `npm ci` temp blowups during lockfile sync

These are correctness signals, not hygiene tasks.

### Why violations are correctness bugs

Storage drift changes the factual inputs and evidence of deterministic systems.
Any untracked or unbounded storage change can alter replay, auditability, and
reproducibility. Therefore, storage violations are correctness bugs.

## Future/Target behavior

- None. Storage is closed unless a new bug class is proven.

## Related docs

- `docs/guardrails.md`
- `docs/doctrine.md`
- `tests/replay/README.md`
