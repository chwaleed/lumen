# ADR 0005: E2E tests capture named screenshots as proof

**Status:** Accepted

## Context

A passing e2e suite reports a green tick and discards what it saw. Reviewing a flow, or
showing someone that it works, meant running it locally. Playwright's default captures
screenshots only on failure.

## Decision

E2E specs import `test` from `tests/e2e/support/test-base` and call a `proof(name)` fixture
at points a reviewer would want to see. Each call writes
`tests/artifacts/screenshots/<feature>/<spec>/<test>/NN-name.png`, numbered in call order,
and attaches it to the HTML report.

## Consequences

- A passing run leaves an ordered visual record, not just a tick.
- Screenshots mirror the spec's own folder hierarchy, so they stay navigable as the suite
  grows.
- Everything under `tests/artifacts/` is gitignored, plus `tests/**/*.png` so a misrouted
  screenshot cannot be committed as source.
- Determinism needed two fixes, both in the fixture: Next's dev-mode overlay badge is
  hidden, and in-flight animations are awaited so panels are not caught mid-fade.
  Playwright's `animations: "disabled"` is deliberately **not** used — it rewinds motion's
  entrance animations to opacity 0 instead of completing them.
- Costs a screenshot per call in wall-clock time. Acceptable at this suite size.
