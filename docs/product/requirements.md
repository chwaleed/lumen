# Product requirements

**STATUS: TEMPLATE** — headings only. The sections below need a product owner; they cannot
be derived from code, and inventing them would be worse than leaving them empty.

For what the system *does* today, see [feature-inventory.md](feature-inventory.md). For
requirements reverse-engineered from the implementation, see the [SRS](../srs.md) — note
that its `[ASSUMED]` entries are exactly the ones this document should confirm or correct.

---

## Problem

Who has this problem, how do they solve it today, and why is that unsatisfactory?

## Target users

Who specifically. "Researchers" is not an answer; "PhD students co-authoring IEEE
conference papers who currently use Overleaf's free tier" is.

## Goals

What success looks like, in terms that could be measured.

## Non-goals

What this deliberately will not do. As useful as the goals — it is what stops scope drift.

## Competitive position

Overleaf is the obvious incumbent. What is the reason to use this instead?

## Success metrics

What you would measure to know it is working, and the current baseline for each.

## Open questions

Decisions blocking work, with who needs to make them.

---

## Why this matters for the SRS

Several requirements in the SRS are marked `[ASSUMED]` — implemented behaviour whose intent
no written source confirms. Filling this document in lets those be confirmed as real
requirements or corrected as accidents. Until then, they are a guess.
