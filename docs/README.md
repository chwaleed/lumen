# Lumen documentation

## The two core documents

| | |
|---|---|
| **[Software Requirements Specification](srs.md)** | *What* Lumen must do. Numbered, traceable requirements with their implementation status, plus the known gaps. |
| **[Software Design Document](sdd.md)** | *How* it does it. Architecture, data design, detailed design of the non-obvious algorithms, security design. Cites SRS requirement IDs throughout. |

Read the SRS first, then the SDD. Everything else here supports those two.

> Both were written by reading the code, so they describe what is true now rather than what
> was once planned. The SRS marks inferred intent `[ASSUMED]` and unimplemented capability
> `[PROPOSED]`, so the difference between "designed this way" and "turned out this way"
> stays visible.

## Everything else

```
docs/
  srs.md                       requirements
  sdd.md                       design
  decisions/                   ADRs — why specific choices were made
  product/
    ai-agent-vision.md         assessment of the autonomous-agent direction
    feature-inventory.md       what the product does today, from the code
    requirements.md            TEMPLATE — needs a product owner
    roadmap.md                 PARTIAL — gaps are real, sequencing is not
  testing/strategy.md          what we test, what we don't, and why
  operations/
    deployment.md              how a release reaches a server
    runbook.md                 routine tasks and first responses
```

## What goes where

Duplicated docs rot in opposite directions, so the split is deliberate.

| Location | Holds | Changes when |
|---|---|---|
| `README.md` (root, `backend/`, `frontend/`) | **How to work here** — setup, commands, layout | the tooling changes |
| `CLAUDE.md` | **Working standards** — commit discipline, conventions; loaded by agents each session | a convention changes |
| `docs/` | **What, why, and what's next** | a requirement, design or plan changes |

Rule of thumb: if a new contributor needs it in their first hour, it belongs in a README.
If they need it before changing a design, it belongs here.

## Maintaining these

- **The SRS and SDD describe the present.** Update them in the same commit as the change
  they describe. A design document that lags the code is worse than none, because it is
  believed.
- **ADRs are append-only.** Never rewrite one to match a new decision — write a new ADR and
  mark the old superseded. See [decisions/README.md](decisions/README.md).
- **`STATUS: TEMPLATE` pages** have headings and no content. They exist so the gap is
  visible rather than forgotten. Fill them in; don't delete the headings.
- **Don't restate a README.** Link to it. Commands live in READMEs; reasoning lives here.

## Current state, honestly

| Area | Status |
|---|---|
| SRS, SDD, ADRs | Written and current |
| Testing strategy | Current — 243 tests |
| Operations | Written; describes a deployment that does not exist yet |
| Product requirements, roadmap sequencing | **Templates** — need a product owner |
| LaTeX compilation | **Not implemented.** The preview shows source beneath an "Auto-compile On" label |
| CI | **None.** Deploy workflow commented out; nothing runs the tests |
| Secure cookies | **Disabled** deliberately; must be enabled before public deployment |
| Test database parity | **Gap.** Tests on SQLite, production on Postgres 16 |
