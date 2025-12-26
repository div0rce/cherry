Problem:
Typed ESLint surfaced files outside its TS program.

Root cause:
Lint scope diverged from TSConfig scope; scripts were typechecked under app semantics.

Key insight:
ESLint is correct when it reports project-boundary violations.

Fix:
Introduce a TSConfig lattice (base/app/scripts/eslint) and explicit ESLint routing.

Invariant:
Every linted file belongs to exactly one TS program.

Result:
Editor and CI share one semantic universe with no implicit assumptions.
