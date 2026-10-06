# ADR 0008: Compile with latexmk and pdfTeX on pinned TeX Live, isolated per compile

**Status:** Accepted

## Context

Compilation is Phase 1 and blocks every other phase. "Which compiler" turned out to be five
independent decisions, researched in
[research/latex-compiler-selection.md](../research/latex-compiler-selection.md):
engine, orchestrator, distribution, build-versus-buy, and isolation.

The forces that decided it:

- Primary users are thesis writers using **university and journal class files they cannot
  modify**. A missing package is a hard failure on someone's submission, and we cannot
  enumerate in advance which packages they need.
- Documents must build **reproducibly**. A thesis that compiled last month must compile the
  same way today.
- Users upload arbitrary `.tex`, `.sty`, `.cls` and `.bib` files, so **executing untrusted
  code is a planned feature**, not an edge case.
- The agent compiles **5–20 times per request**, seconds apart, on a barely-changed
  document. Per-compile latency and cost are existential, not cosmetic.
- Lumen is closed-source and commercial, so component licences matter.

Two candidates were rejected rather than overlooked. **Tectonic** is a single MIT-licensed
binary that fetches packages on demand — attractive against TeX Live's bulk — but it offers
only an XeTeX-derived engine, fetches over the network at compile time (which the sandbox
forbids), has documented `biber` problems, and its maintainers have said they lack time for
serious work on it. **Overleaf's CLSI** does exactly this job and is open source, but it is
AGPL-3.0 and its sandboxing is a paid Server Pro feature, absent from the Community Edition
that is "intended for use in environments where all users are trusted."

A premise raised during review and worth recording as false: there is **no sense in which
LuaTeX is more AI-compatible than pdfTeX**. Its Lua scripting is for document authors; the
agent writes `.tex` and reads a log, identically on every engine. If anything the argument
runs the other way, since models are trained overwhelmingly on pdfLaTeX-targeted material.

## Decision

| Layer | Choice |
|---|---|
| **Orchestrator** | **`latexmk`**, with `-interaction=nonstopmode`, `-file-line-error`, `-synctex=1` |
| **Engine** | **pdfLaTeX by default.** All three wired (`-pdf` / `-pdfxe` / `-pdflua`) and stored as a per-project value; only pdfLaTeX is *supported* in Phase 1 |
| **Distribution** | **TeX Live full scheme, no docs or sources** — `texlive/texlive`, **pinned by digest**. 2.56 GB compressed, ~4.5 GB on disk |
| **Build vs buy** | **Our own service in Python, modelled on CLSI's architecture**, depending on no part of it |
| **Isolation** | **One throwaway container per compile**: `--network=none`, non-root, read-only TeX tree, `tmpfs` output with a size cap, hard CPU/memory/PID/wall-clock caps, all capabilities dropped. In `texmf.cnf`: `shell_escape=f`, `openin_any=p`, `openout_any=p` |
| **Compile profiles** | **Two.** A single-pass `-draftmode` *fast check* for the agent's inner loop, and a full `latexmk` build for users and the agent's final pass |

`openin_any` defaults to `a` — read any file — which is an arbitrary-file-read primitive
enabled out of the box. It must be changed explicitly.

**On pinning.** The first draft of this ADR said "pinned to an explicit dated tag", on the
strength of Docker Hub's description advertising `TL{YEAR}-{MONTH}-{DAY}-{HOUR}-{MINUTE}`
tags. A full tag listing on 2026-10-06 shows **no such tags exist** — the registry carries
`TL2013`–`TL2025`, all `-historic`, and the current release only through mutable `latest*`
tags. The intent is unchanged (pin immutably, never track `latest`); the only mechanism that
delivers it today is the **digest**. A dated tag for TeX Live 2026 appears only once 2027
ships and `TL2026-historic` is published.

## Consequences

- **`minted` and `gnuplottex` will not work**, because they need shell escape. `minted` is
  common in CS theses, so this needs a documented answer — `listings` as the alternative, or
  `minted`'s cache workflow — before launch, not after the first support ticket.
- **Until XeLaTeX is supported, Urdu, Arabic, Persian and CJK users cannot be served**, and
  neither can mandated OpenType fonts. `fontspec` fails outright on pdfTeX. The engines ship
  in the image already, so this is a testing and support commitment, not infrastructure.
- **We own the log parser.** Declining CLSI means declining the most battle-tested LaTeX log
  parser in existence. The agent's accuracy is bounded by this, so it is a real subproject,
  not a line item.
- **pdfTeX is frozen upstream** — maintenance mode, with development moved to LuaTeX, its de
  facto successor. A migration of the default engine is likely eventually. Storing the engine
  per project from the first migration is what keeps that a config change.
- ~4.5 GB of disk per compile worker, and a slower cold start when autoscaling.
- Throwaway containers **discard the `.aux` and `.fmt` caches** that would make the agent
  loop fast. Caches must live outside the container, remounted per job and **keyed per
  project** — a shared cache would be a cross-tenant channel.
- A container shares the host kernel, so this is the responsible minimum and not the end
  state. **gVisor before public multi-tenant launch**, pending the measurement below.
- **This decision rests partly on unmeasured numbers.** Real compile time for a real thesis,
  gVisor's overhead on LaTeX, container startup against a 4.5 GB image, and what
  `-draftmode` actually buys are all unknown — public figures are hello-world benchmarks or
  untraceable. See §9 of the research document. The isolation choice in particular should be
  revisited once measured.

### What would make this wrong

- Measured container startup making per-compile isolation unaffordable → warm per-user pools,
  or Tectonic as a fast path for simple documents.
- A journal ecosystem shift toward Typst → it becomes a second engine rather than a rejected
  one.
- TeX Live image size dominating autoscaling cost → revisit Tectonic's on-demand bundles.
