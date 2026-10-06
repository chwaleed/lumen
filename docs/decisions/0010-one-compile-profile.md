# ADR 0010: One compile profile, not two

**Status:** Accepted
**Revises:** the compile-profile row of [ADR 0008](0008-latex-compiler-stack.md)

## Context

ADR 0008 specified two compile profiles: a single-pass `-draftmode` *fast check* for the
agent's inner loop, and a full `latexmk` build for users and the agent's final pass. The
reasoning was that the agent mostly needs to know *"are there errors, and where"*, and that
skipping passes, bibliography and PDF writing would make its 5–20 iterations per request
affordable.

The cold-build numbers appeared to confirm it — on the 215-page corpus, check 7.0 s against
full 35.9 s, a 5× win. **But the agent's loop is warm, not cold**, and M0 measured the warm
case afterwards:

| Operation, 215-page thesis across 72 files | Time |
|---|---|
| Cold full build (`latexmk`, converges aux + biber + index) | 34.2 s |
| `latexmk` no-op, nothing changed | **0.44 s** |
| **Full `latexmk` rebuild after editing one section file** | **6.8–8.2 s** |
| **Single-pass `-draftmode` rebuild after editing one section file** | **7.6–8.4 s** |

**The check profile is not faster warm — it is marginally slower.** Once the `.aux` files have
converged, `latexmk` needs a single pass and skips biber and makeindex by itself, so it does
the same work as the check profile and produces a real PDF and a correct bibliography as
well.

The 5× cold win was never `-draftmode`; it was latexmk doing 3–4 passes plus biber plus
makeindex on a document whose cross-references had not converged yet.

`-draftmode` itself was measured directly on a deliberately image-heavy document — 30 PNGs,
23 MB — and saved **13%** (697 ms → 604 ms), not the 5–10× that circulates online. pdfTeX
passes raster images through without recompression, so there is little to skip.

## Decision

**One profile: `latexmk`, for users and for the agent.**

The agent varies **flags**, not profiles:

- `-halt-on-error` when it wants the first error only; omit it when the user wants the whole
  log.
- `latexmk`'s own change detection is the optimisation. Its 0.44 s no-op also answers "has
  anything changed?" cheaply.

A project's **first** compile still costs a cold build (~36 s at thesis scale). That is paid
once per project, not once per iteration.

## Consequences

- **A whole code path disappears from M2.** No profile concept, no second flag matrix, no
  decision about which profile a given request gets.
- The agent gets a correct PDF and resolved citations on every iteration, not a draft
  artifact — so visual checking and citation verification need no separate build.
- **Warm state becomes load-bearing.** The win depends entirely on `.aux`/`.fls`/`.fdb_latexmk`
  persisting between compiles. ADR 0008 already requires a per-project cache outside the
  throwaway container; this makes that requirement a performance dependency rather than an
  optimisation. **If the cache is lost, every agent iteration costs 36 s instead of 7 s.**
- An agent task of 20 iterations costs roughly 20 × 7 s ≈ 140 s of compile, plus one cold
  build. That is the number to price against.
- **Measured on one generated corpus.** Its figures are TikZ and pgfplots, generated inline;
  a document using external EPS, `tikz` externalisation or `minted` heavily may behave
  differently. Re-measure before concluding this holds generally.

### What would make this wrong

- A document class where warm rebuilds stay expensive because cross-references never
  converge.
- Finding a cheap syntax-only check — a parser rather than a compile — that beats 7 s. That
  would be a *third* thing, not the `-draftmode` profile this ADR removes.
