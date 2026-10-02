# ADR 0004: Organise tests by feature, not by type

**Status:** Accepted

## Context

Tests can be grouped by type (`unit/`, `integration/`, `e2e/`) or by feature
(`auth/`, `projects/`). The backend started flat — seven files in one directory — which was
already hard to scan and would not survive growth.

A further constraint: the two codebases should not require learning two layouts.

## Decision

A feature owns a folder of the same name in **every** test tree, in both codebases:

```
backend/tests/unit/<feature>/     backend/tests/api/<feature>/
frontend/tests/unit/<feature>/    frontend/tests/e2e/<feature>/
```

`backend/tests/unit/` mirrors `src/` one-for-one.

## Consequences

- Adding a feature means adding folders, never editing test config — both runners discover
  by convention.
- Any feature can be tested alone: `pytest tests/unit/uploads`, `bun test auth`,
  `playwright test tests/e2e/auth`.
- All of a feature's tests are visible in one place when changing it.
- Needed two pieces of configuration, each recorded where it is set: pytest uses
  `--import-mode=importlib` so several features can own a `test_service.py` without
  `__init__.py`, and `bunfig.toml` pins bun's root to `tests/unit` because bun's default
  glob also matches Playwright's `*.spec.ts`.
