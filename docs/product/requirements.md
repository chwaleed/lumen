# Product requirements

**Status:** Defined. Prices and dates are the remaining open questions (§8).

## 1. Problem

Writing a large document in LaTeX — a thesis, a book, a multi-chapter report — means
managing dozens of files, cross-references, citations and a compiler whose error messages
are famously unhelpful. Two things make it worse:

1. **Existing editors are paid and limited.** Overleaf's free tier restricts compile time
   and collaborators; serious use requires a subscription.
2. **AI help stops at one file.** Current assistants handle a single document well and a
   real project badly. They cannot create files, wire them together, compile, read the
   errors and fix them. A student restructuring a thesis across 40 files is on their own.

Meanwhile coding has solved exactly this shape of problem — Claude Code, Replit and
similar tools edit many files, run the build, read the failure and iterate. **Nothing does
that for LaTeX.**

## 2. Target users

| Priority | Who | Why them |
|---|---|---|
| **Primary** | Postgraduate students writing a thesis or dissertation | Largest documents, least budget, most pain, and a hard deadline |
| **Secondary** | Academics and researchers writing papers | Repeat usage, template-sensitive (IEEE, ACM, Springer) |
| **Tertiary** | Anyone producing formal documents in LaTeX — CVs, books, reports | Broad but shallow usage |

Not targeted: casual users who would be better served by a word processor.

## 3. Goals

1. **Make LaTeX compilation free and unremarkable.** Press a button, get a PDF. No
   subscription to read your own document.
2. **Make an agent that handles a whole project**, not a file — creating, linking,
   compiling, fixing, iterating until the document builds.
3. **Be the tool a student finishes their thesis in**, because it removes the LaTeX
   mechanics rather than merely assisting with them.

## 4. Non-goals

Stating these because each is a plausible-sounding direction that would dilute the product:

- **Not a Word competitor.** No WYSIWYG writing surface.
- **Not a realtime collaboration tool** in version one. Single-owner projects. Collaboration
  is a later decision, not a launch requirement.
- **Not a general writing assistant.** The agent's job is the document's structure and
  correctness, not generating its intellectual content.
- **Not a template marketplace business.** Templates are a secondary feature that supports
  the editor; they are not the product.
- **No third-party sellers.** Templates are first-party only. Revisit only if there is
  demand that first-party supply cannot meet.

## 5. The product in two features

Everything is one of these two, plus the editor they sit in.

| | Feature | Model |
|---|---|---|
| **Primary 1** | **LaTeX compilation** — build any project to PDF, see errors, see output | **Free and unlimited, on every plan** |
| **Primary 2** | **Agentic AI** — an agent that works across the whole project autonomously | Paid. The reason anyone subscribes |
| **Secondary** | **Templates** — first-party, professionally built starting points | Free tier plus paid premium templates, bought once |

## 6. Business model

**Compilation acquires; the agent monetises; templates add margin.**

| Plan | Compiles | Agent tasks | Templates |
|---|---|---|---|
| **Free** | **Unlimited** | — | Free templates |
| **Pro** | **Unlimited** | 100 / month | Free templates; may buy premium |
| **Max** | **Unlimited** | 500 / month | Free templates; may buy premium |

**Compilation is unlimited on every plan, including free.** This is the headline claim
against Overleaf, whose free tier limits compile time. It is deliberately not a paywall and
not an upgrade lever.

"Unlimited" means **no quota**, not "no limits". Fair-use protections still apply to every
plan — per-user concurrency and rate limits, a build timeout, and a project size ceiling.
Those exist to stop one account or a runaway loop starving the shared compile fleet, not to
push upgrades, and a normal user will never meet them. Paid plans may receive higher
concurrency and priority in the queue; neither is a cap on how much you may compile.

> **Cost consequence, stated plainly.** Free users will cost real money in compute and
> return no revenue. The agent subscription has to carry them. That makes
> *cost per completed agent task* (§7) the number the business turns on, and it makes
> compile efficiency a margin issue rather than only a performance one.

- **An agent task** is one request the agent works on until it is done — however many file
  edits and compiles that takes. Users can predict what they are buying.
- Every task carries a **hard ceiling** (compiles, tokens, wall-clock). A task that hits the
  ceiling stops and reports partial progress; it does not silently cost more. This is what
  keeps per-task cost bounded.
- **Premium templates are one-time purchases** with permanent access, independent of
  subscription state.
- Payments via **Stripe**; subscription state is authoritative in our own database, updated
  by webhook.

**Prices: open question (§8).**

## 7. Success metrics

Measured from first release; baselines are zero because nothing is launched.

| Metric | Why it matters |
|---|---|
| **Compile success rate** | If a project cannot build, nothing else matters |
| **Agent task completion rate** | Did the agent finish and leave a document that compiles cleanly? |
| **Cost per completed agent task** | Decides whether the business works at all. Track from the first task |
| **Free → paid conversion** | Whether the agent is worth paying for |
| **Documents finished** | The real outcome. Proxy: projects compiled more than N times over more than N weeks |

The third one is the one to watch earliest. The product can be loved and still fail if a
task costs more than the subscription spread over it.

## 8. Open questions

| Question | Blocks |
|---|---|
| **Price points for Pro and Max** | Cannot be set credibly until cost-per-task is measured. Build metering first, price second |
| **Per-task ceiling values** — how many compiles, how many tokens, what wall-clock | Agent design |
| **Which models, and whether users may bring their own key** | Cost model, and whether a cheap tier is possible |
| **Stripe availability and payout method** for the operating country | Billing implementation |
| **Launch template set** — which 10–15 templates ship first, and which are premium | Template production |
| **Fair-use values** — concurrent compiles per user, build timeout, project size ceiling | Compile service design. Needs real usage data; start generous and tighten only if abused |

## 9. Relationship to other documents

- [feature-inventory.md](feature-inventory.md) — what exists today versus what is planned
- [roadmap.md](roadmap.md) — the order of work
- [ai-agent-vision.md](ai-agent-vision.md) — feasibility assessment of the agent, and the
  hardest problems in building it
- [../srs.md](../srs.md) — these requirements expressed as numbered, testable requirements
