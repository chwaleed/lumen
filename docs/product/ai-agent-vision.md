# Assessment: Lumen as an autonomous LaTeX agent

**The idea:** a LaTeX editor where an AI agent handles whole projects the way Claude Code
or Replit handle codebases — reads many files, creates and links new ones, compiles, reads
the errors, fixes them, and repeats until the document builds.

This is my honest assessment. Short version: **the core insight is right, the AI is the
easy part, and the hard part is infrastructure you have not started yet.**

---

## 1. Why the idea is stronger than it sounds

Most "AI writing tool" ideas fail for one reason: there is no way for the machine to
**check its own work**. It writes something plausible, and nobody — including the model —
knows if it is right.

LaTeX is different. **LaTeX has a compiler.** That is a ground-truth oracle, and it is
exactly what makes coding agents work. The loop that makes Claude Code useful —

> edit → run → read the error → fix → run again

— maps onto LaTeX perfectly, with the compiler playing the role of the test suite. Very few
writing domains have this. You picked one that does.

Four things compound that:

| | |
|---|---|
| **Errors are machine-readable** | The log gives file, line, and message. Parseable, not guesswork. |
| **Output is visually checkable** | Render a page to an image, show it to a vision model. Layout problems become detectable. |
| **LaTeX has real structure** | `\input`, `\label`, `\ref`, `\cite` are explicit symbols. You can build a project graph, exactly like a code index. Prose has no equivalent. |
| **Users already hate the work** | Nobody enjoys debugging "Missing $ inserted". Willingness to delegate is unusually high. |

Your read on the gap is also correct. Current tools do single-file assistance well and
multi-file poorly. "Rename this concept across 40 chapter files and fix every cross-
reference" is a real job nobody serves well today.

**Verdict: the premise is sound.** The risk is not whether it can work. It is cost,
infrastructure, and timing.

---

## 2. What you already have that helps

More than you might think:

- **Versioned snapshots.** `file_snapshots` is append-only, so *every agent edit is already
  a revertable version*. Agent editing needs exactly this, and you built it before you
  needed it. This is the best thing in the codebase for this plan.
- **A file-tree API** with create/rename/move/delete and ownership checks — that is the
  agent's toolset, already written and tested.
- **A thin, testable service layer.** Agent tools can call services directly.

## 3. What you are missing

**You cannot compile.** The preview shows raw source beneath a badge reading
"Auto-compile On", and both PDF buttons do nothing.

Be clear about what this means: **the entire plan rests on a capability that does not
exist yet.** The agent loop is "edit → compile → fix". Without the middle step, there is no
loop — just another chatbot guessing. Everything else below is secondary to this.

---

## 4. What is actually hard, ranked

| # | Problem | Why | Difficulty |
|---|---|---|---|
| 1 | **Sandboxed compilation** | LaTeX executes arbitrary code (`\write18`), loops forever, eats memory. Every compile must be isolated and resource-capped. A full TeX Live is ~5 GB. | **Very hard** |
| 2 | **Compile latency × cost** | A real thesis takes 10–60s per build, and references need 3–4 passes. An agent doing 20 iterations costs 20 minutes and a lot of tokens. | **Very hard** |
| 3 | **Context for large projects** | A thesis is 50–200 files. It does not fit in context. You need an index, a `\label`/`\cite` graph, and selective reading. | Hard but solved elsewhere |
| 4 | **Error interpretation** | LaTeX errors are famously bad — wrong line numbers, cascading failures, one real error producing fifty messages. | Hard, and a real differentiator |
| 5 | **Compiles ≠ correct** | A document can build perfectly and still be wrong: `??` cross-references, a figure floating ten pages away, a table off the page edge. The compiler will not tell you. | Hard — needs visual checking |
| 6 | **Trust** | A bad code edit fails a test. A bad thesis edit silently changes your meaning or your citation. **Hallucinated references are an academic-integrity disaster.** | Product problem, not technical |

### The single hardest thing

**Making the compile loop fast and cheap enough to run many times per request.**

Everything about the product depends on iterating: compile, read error, fix, compile again.
That loop is simultaneously slow (seconds to a minute), expensive (containers plus tokens),
and dangerous (arbitrary code execution). Those three constraints fight each other — the
safe option is slow, the fast option is unsafe, and both cost money per iteration.

This is where Overleaf's real moat is. It is not their editor. It is a decade of running
LaTeX compilation safely and cheaply at scale. **It is also not an AI problem** — it is
systems engineering, and it is the part your current stack does not touch at all.

---

## 5. The business risk nobody mentions

Your positioning is "the others are paid and limited". Your differentiator is an AI agent.

**Those two fight each other.** Agent loops burn tokens and compute. A single "fix my
bibliography across the whole thesis" session could cost real money in inference plus
compile minutes. Overleaf's free tier is cheap for them to serve because they serve a text
editor. Yours would not be.

So: you cannot be both the cheap one and the agentic one, for the same user, forever. Pick
deliberately —

- free tier = editor + compile, no agent; agent is the paid feature; or
- generous agent limits, priced above Overleaf, sold on capability rather than price.

Decide this early. It changes what you build.

---

## 6. What is doable, in order

**Stage 0 — Compile. Nothing else matters until this works.**
Container with TeX Live, no shell-escape, hard CPU/memory/time caps, one container per
compile, `latexmk` for the multi-pass logic. Return the PDF and the parsed log. *This is
not AI work, and it is the whole foundation.*

Build it as a **queued service from day one**, even for ten users — see §8. Retrofitting a
queue once compiles are inline in request handlers is the expensive version of this.

**Stage 1 — A real agent loop.**
Give a model tools: `list_files`, `read_file`, `write_file`, `compile`, `read_log`. Let it
iterate until the build is clean. This is a well-understood pattern and the models are
already good enough — expect this to be the *easiest* stage, not the hardest.

**Stage 2 — Large projects.**
Build the project index: the `\input` graph, every `\label` and `\cite`, a section map. The
agent navigates by structure instead of reading everything. This is what lets you beat the
tools that choke past a few files — it is your actual differentiator, so do it properly.

**Stage 3 — Visual verification.**
Render changed pages to images and have a vision model check layout. This is how you catch
the "compiles but looks wrong" class that nothing else catches.

**Stage 4 — Autonomous project creation.**
Outline → file structure → draft → compile → fix. This is the demo everyone wants, and it
is only credible once 0–3 are solid.

Do not reorder these. Stage 4 without Stage 0 is a chatbot with a text box.

---

## 7. How you will know it is working

Pick a measurable claim rather than a vibe. Something like:

> Take a real 100-page thesis with 60 files. Ask for a change that touches many of them —
> rename a concept everywhere, restructure a chapter, fix every broken reference. Does it
> complete, compile cleanly, and leave the document correct?

Run it against Overleaf's assistant and Prism. If you win on that one task, you have a
product. If you cannot run that test, you cannot claim "handles large projects".

Track three numbers from the start: **compiles-to-clean rate**, **iterations per fix**, and
**cost per completed task**. The third one decides whether the business works.

---

## 8. How many concurrent users to build for

**Short answer: 100 for launch. And "concurrent users" is the wrong unit — design for
compiles per second.**

### Why the unit is wrong

An editing user is almost free. They type, think, and read — the server is idle most of
that time. A *compiling* user is expensive: one CPU core held for seconds.

So the question is not "how many users" but **"how many compiles per second, and how long
does each take"**. Those two numbers decide your entire infrastructure bill.

### The arithmetic

Concurrent compiles ≈ (users ÷ seconds between compiles) × seconds per compile.

| Scenario | Compiles in flight | Cores needed | Rough cost |
|---|---|---|---|
| 100 users, compile every 2 min, 10s build | ~8 | ~8 | One 8-core VM |
| 500 users, compile every 2 min, 10s build | ~42 | ~42 | 5–10 VMs |
| 500 users, 10% running agent loops | ~70 | ~70 | 10–16 VMs, roughly $500–1200/mo |
| Any of the above on thesis-sized documents (30s builds) | **×3** | **×3** | |

Two things fall out of that table:

1. **The agent changes everything.** A human compiles every couple of minutes. An agent
   compiles every few seconds, 5–20 times per request. Fifty agent users can outweigh four
   hundred and fifty editing ones.
2. **500 users is not 5× the cost of 100.** It is 5× the compile fleet *plus* a step change
   in architecture — queues, worker pools, autoscaling, and the operational burden of all
   three.

### What your stack caps out at today

Two hard limits, both currently unset and both easy to fix:

| Limit | Current | Effect |
|---|---|---|
| **Database connection pool** | SQLAlchemy defaults — `pool_size=5`, `max_overflow=10` = **15 connections** | Past ~15 simultaneous queries, requests block for 30s and then error |
| **Request worker threads** | Every endpoint is sync `def`, so FastAPI uses the anyio threadpool — **40 threads** | 40 in-flight requests, then queuing |

Forty threads competing for fifteen connections is the real ceiling, and it will bite well
before 500 users. `create_engine` takes `pool_size` and `max_overflow` — a two-line change
once you know your target.

Three other things block running more than **one** backend instance:

- **Migrations run at startup** ([ADR 0002](../decisions/0002-run-migrations-at-application-startup.md)),
  which races if two containers boot together. Needs a lock or a separate migration step
  before horizontal scaling.
- **No rate limiting.** With a shared compile pool, one user — or one runaway agent — can
  starve everyone else. This stops being a security nicety and becomes a capacity control.
- **No CI, no load testing.** You currently have no way to find your real ceiling except in
  production.

### The distinction that actually matters

**Build for 100. Architect so 500 is a configuration change, not a rewrite.**

That means, from the first version:

- Compilation is a **separate service behind a queue**, never inline in a request handler.
  Agent and user builds are jobs, not HTTP calls.
- Compile workers are **stateless and horizontally scalable** — scaling is adding workers.
- The queue is **observable**: depth, wait time, and compiles per second. The queue backing
  up is your signal to scale, and it is a far better signal than a user count.
- Agent sessions have a **compile budget** (say 20 iterations), so one task cannot consume
  the fleet.

Get those four right and moving from 100 to 500 is spending money, not rebuilding. Get them
wrong and 500 means a rewrite under load.

### Recommendation

**Target 100 concurrent users.** Reasons, in order:

1. You have zero users today. 500 concurrent implies a genuinely successful product — very
   roughly 10,000–50,000 daily actives. Building for that first is paying for a problem you
   have not earned yet.
2. Your unit economics are unproven. Until you know the cost per completed agent task
   (§7), you cannot tell whether 500 concurrent users is a good outcome or a monthly bill
   that sinks you.
3. 100 fits comfortably on one modest machine, which keeps you fast and cheap while the
   product is still changing shape.
4. The step from 100 to 500 is operational, not architectural — *provided* you build the
   queue up front.

The only reason to pick 500 now is a committed launch with a known user count. If this is a
public beta, 100 is right, and watching the queue will tell you when it stops being right.

## 9. What I would do first

1. **Build compilation.** Nothing is real until a user can press Compile and get a PDF.
2. **Remove the "Auto-compile On" label** until it is true. Shipping a label for a feature
   that does not exist trains users not to believe the interface.
3. **Then** a minimal agent on a *small* project — three files, one deliberate error, let
   it fix the build. That proves the loop end to end.
4. Only then chase large projects.

Honest framing: you are perhaps 10% of the way to this vision, and the remaining 90% is
mostly not the AI. What you have built — auth, projects, the file tree, versioning, 243
tests — is a sound foundation, and most people skip it. But it is the *editor*. The product
you are describing is a **compilation and agent platform** that happens to have an editor
attached, and that part has not started.

That is a worthwhile thing to build. Just go in knowing which problem you are actually
solving.

---

*This is an engineering opinion on feasibility, not market research or a business plan.
See [roadmap.md](roadmap.md) for the concrete gaps in the current build, and
[requirements.md](requirements.md) — still a template — for where this vision should turn
into committed requirements.*
