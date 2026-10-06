# Portable prompt: LaTeX compiler selection

For cross-checking [latex-compiler-selection.md](latex-compiler-selection.md) against other
models (ChatGPT, Gemini, Grok, DeepSeek) or against human experts.

**Use the two prompts in order.** Prompt A is deliberately *unanchored* — it does not reveal
our tentative answer, so you get an independent opinion rather than agreement with ours.
Prompt B then asks the model to attack our actual recommendation. Running B first
contaminates the result, so don't.

Copy everything inside each fenced block.

---

## Prompt A — independent recommendation

```text
I'm building a commercial SaaS LaTeX editor and need to choose the compilation
stack. Please give me a thorough, opinionated recommendation with reasoning and
sources. Flag any claim you are not confident about rather than presenting a
guess as fact.

## The product

A web-based LaTeX editor whose two primary features are:

1. LaTeX compilation — free and UNLIMITED on every plan, including the free
   tier. This is the acquisition feature and the headline claim against
   Overleaf, whose free tier caps compile time at 10 seconds. Fair-use
   protections (per-user concurrency, build timeout, project size ceiling) are
   allowed; usage quotas are not.

2. An autonomous AI agent — works across a whole multi-file project the way
   Claude Code or Cursor work on a codebase. It reads many files, creates and
   links new ones, compiles, reads the error log, fixes the errors, and
   iterates until the document builds. This is the paid feature and the only
   source of subscription revenue.

Templates (first-party, some premium, one-time purchase) are a secondary
feature.

## Target users

- Primary: postgraduate students writing a thesis or dissertation. Large
  documents (50-200 files, 100-300 pages), bibliographies, university-mandated
  .cls files, hard deadlines, little money.
- Secondary: academics writing papers for IEEE, ACM, Springer, Elsevier.
- Multilingual users matter: some write in Arabic, Urdu, Persian, Hebrew,
  Chinese, Japanese or Korean, or must use a mandated OpenType font.

## Current state

- Backend: Python, FastAPI, SQLModel, PostgreSQL 16, Alembic. Deployed in
  Docker. All request handlers are currently synchronous.
- Frontend: Next.js 16, React 19, TypeScript, Monaco editor.
- Built and tested: authentication, projects, a full file tree
  (create/rename/move/delete), Monaco editing, append-only versioned file
  snapshots, S3 image upload.
- NOT built: any compilation whatsoever. No PDF is ever produced today. No
  agent. No billing.
- Zero users. Pre-launch. Initial capacity target is ~100 concurrent users,
  architected so that 500 is a configuration change rather than a rewrite.
- Small team, limited budget. Free-tier compilation is a pure cost centre that
  the agent subscription must fund.

## Critical constraints

- Users upload arbitrary .tex, .sty, .cls and .bib files. This is untrusted
  input and executing it is a planned feature, not an edge case.
- The agent compiles 5-20 times per request, seconds apart, on a document that
  has barely changed. Human users compile every few minutes. Per-compile
  latency and per-compile cost are therefore existential, not cosmetic.
- Documents must build reproducibly. A thesis that compiled last month must
  compile the same way today.
- Journal and university class files must work. A missing package is a hard
  failure on someone's thesis, and we cannot enumerate in advance which
  packages they need.
- This is commercial closed-source software, so component licences matter.
  AGPL in particular needs care.

## What I need answered

1. ENGINE: pdfTeX, XeTeX, LuaTeX, or Tectonic? Which default, and should
   users be able to choose per project? What does each one cost or buy us?

2. ORCHESTRATOR: latexmk, arara, rubber, Tectonic's internal loop, or our own
   pass logic? How should the number of passes and the bibliography tool be
   decided?

3. DISTRIBUTION: TeX Live or MiKTeX? Which TeX Live scheme, given that a full
   install is roughly 4 GB without documentation? How should it be pinned and
   upgraded? Should individual projects pin a TeX Live year?

4. BUILD VS BUY: Overleaf's CLSI is open source and does roughly this job, but
   is AGPL-3.0 and its sandboxing is a paid Server Pro feature. Should we
   adopt it, fork it, or build our own modelled on it? Please address the AGPL
   question concretely for a closed-source commercial SaaS where the compile
   service would sit behind an internal HTTP boundary.

5. ISOLATION: What is the minimum responsible sandbox for running untrusted
   LaTeX? Compare hardened containers, nsjail/bubblewrap, gVisor and
   Firecracker microVMs, with real overhead figures if you have them. Which
   texmf.cnf settings must change from their defaults, and what attacks remain
   possible after shell escape is disabled?

6. THE AGENT LOOP: How do we make 5-20 compiles per request fast and cheap
   enough to sell? Consider draft mode, precompiled preambles, persisting
   .aux files, warm worker pools, and whether the agent's compiles should use
   a different configuration from the user's. What is the realistic floor on
   per-compile latency?

7. ERROR LOG PARSING: The agent's effectiveness depends on turning LaTeX's
   notoriously bad logs into accurate file/line/message triples. Which
   existing parsers should we study or reuse, what are their licences, and
   what are the known hard cases?

8. WHAT WOULD YOU DO DIFFERENTLY? Anything I have framed wrongly, any option
   I have not listed, or any assumption above that you think is mistaken.

## Answer format

- Lead with a concrete recommendation per layer. I need a decision, not a
  survey of possibilities.
- Give reasoning and real numbers. Cite primary sources — project
  documentation, repositories, papers, official docs.
- Separate what you know from what you are inferring. If a figure is widely
  repeated online but not traceable to a reproducible measurement, say so.
- Tell me explicitly what cannot be settled by research and must be measured
  on our own hardware.
```

---

## Prompt B — adversarial review of our recommendation

Run this **after** Prompt A, in a fresh conversation, so the model is not anchored.

```text
A team is building a commercial SaaS LaTeX editor with two primary features:
free unlimited LaTeX compilation, and a paid autonomous AI agent that edits a
whole multi-file project, compiles it, reads the error log and iterates until
the document builds. Primary users are postgraduate thesis writers using
university and journal class files. Backend is Python/FastAPI/PostgreSQL in
Docker. They have zero users, are pre-launch, target ~100 concurrent users,
and have a small team and budget. Users upload arbitrary .tex, .sty, .cls and
.bib files, so untrusted code execution is a planned feature. The agent
compiles 5-20 times per request. The product is closed-source and commercial.

They have tentatively decided:

1. ENGINE: pdfTeX by default, with XeTeX and LuaTeX selectable per project.
2. ORCHESTRATOR: latexmk, with -interaction=nonstopmode, -file-line-error and
   -synctex=1.
3. DISTRIBUTION: TeX Live, full scheme without documentation or sources
   (~4.3 GB), pinned to an explicit dated image tag, from the Island of TeX
   texlive/texlive image. Not MiKTeX, because install-on-the-fly needs network
   access at compile time and destroys reproducibility.
4. BUILD VS BUY: build their own compile service in Python, modelled on
   Overleaf's CLSI architecture but not depending on it — rejected because
   CLSI is AGPL-3.0 and its sandboxing is a paid Server Pro feature absent
   from the Community Edition.
5. ISOLATION: one throwaway container per compile, --network=none, non-root,
   read-only TeX tree, tmpfs output with a size cap, hard CPU/memory/PID/
   wall-clock limits, all capabilities dropped. In texmf.cnf: shell_escape=f,
   openin_any=p, openout_any=p. Add gVisor before public multi-tenant launch.
6. AGENT LOOP: two distinct compile profiles. A "fast check" for the agent's
   inner iterations — single pass, -draftmode, no bibliography,
   -halt-on-error, log output only, no PDF. And a "full build" for users and
   the agent's final pass — full latexmk, all passes, bibliography, SyncTeX,
   PDF. Plus warm per-user worker pools and persisted per-project .aux caches.
7. REJECTED: Tectonic (XeTeX-only, fetches packages over the network at
   compile time which conflicts with the no-network sandbox, rough biber
   integration, maintainer bandwidth concerns). Typst (journals still require
   LaTeX in 2026). Browser-side WebAssembly such as SwiftLaTeX (the agent runs
   server-side and cannot drive a compiler in the user's browser; incomplete
   ICU data; packages fetched from CTAN at runtime). Hosted third-party
   compile APIs (a vendor in the critical path of the core free feature).

Your task: ATTACK this plan. Specifically:

- Which of these decisions is most likely to be wrong, and why?
- What will break first in production, and what will break most expensively?
- Where are they over-engineering for a pre-launch product with no users?
- Where are they UNDER-engineering in a way that will require a rewrite rather
  than a configuration change?
- Is the AGPL reasoning about CLSI actually correct for a service behind an
  internal HTTP boundary, or is it overcautious? Is it undercautious?
- Is disabling shell escape entirely the right call, given that it breaks
  minted and gnuplottex? What do real services do here?
- Will the two-profile compile idea actually work, or does -draftmode plus a
  single pass produce error output misleading enough to send the agent to fix
  the wrong thing?
- Does the throwaway-container rule conflict irreconcilably with the warm-pool
  and persistent-cache optimisations? How do real multi-tenant compile
  services resolve that tension?
- What have they not thought about at all?

Be specific and be harsh. Cite sources. Do not be agreeable — if a decision is
sound, say so in one line and move on to the ones that are not.
```

---

## What to do with the answers

Our own findings, the decisions that remain open, and the measurements that no amount of
reading can settle are all in [latex-compiler-selection.md](latex-compiler-selection.md)
— §9 and §11 in particular.

When comparing replies, weight them by **whether they cite primary sources.** Searches on
this topic surface a lot of confident AI-generated SEO content from LaTeX-tool competitors,
and models repeat its numbers (see §10 of the research document for the specific claims and
sites involved). A model that volunteers "this figure is widely repeated but I cannot trace
it to a reproducible measurement" is being more useful than one that states it crisply.

Treat agreement between models as weak evidence — they likely read the same pages. **A
specific, sourced disagreement is worth more than three confirmations.**
