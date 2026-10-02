# Roadmap

Two primary features — **compilation** and **agentic AI** — plus templates as a secondary
feature. See [requirements.md](requirements.md) for why, and
[feature-inventory.md](feature-inventory.md) for what exists today.

## The dependency that sets the order

```
Compilation ──► Agent loop ──► Large projects ──► Autonomous creation
     │                │
     │                └──► Billing (nothing to charge for until the agent works)
     └──► Templates (a template is worthless if it cannot be built)
```

**Everything depends on compilation.** An agent with no compiler cannot check its own work,
which is the entire reason this product is feasible. Nothing else may go first.

---

## Phase 1 — Compile

**Goal: press a button, get a PDF.** No AI in this phase at all.

| | Work |
|---|---|
| 1.1 | Compile service: TeX Live container, `latexmk`, no shell-escape, hard CPU/memory/time caps |
| 1.2 | Job queue — compiles are jobs, never inline in a request handler |
| 1.3 | Build API: submit, poll status, fetch PDF and log |
| 1.4 | PDF viewer in the preview panel, replacing the raw-source placeholder |
| 1.5 | Log parser: file, line, message; deduplicated, real error first |
| 1.6 | Error navigation — click an error, land on the line |
| 1.7 | Fair-use protection: per-user concurrency, timeout, size ceiling |
| 1.8 | Upload `.bib`, `.cls`, `.sty` — today only images can be uploaded, so real projects cannot build |

**Done when:** a user uploads a real multi-file thesis and compiles it to a correct PDF,
and a broken document produces an error they can click.

**Also fix here:** remove the "Auto-compile On" badge until it is true, and raise the
database connection pool from its default of 15 before any load arrives.

> This phase is systems engineering, not AI, and it is the largest single risk in the plan.
> [ai-agent-vision.md §4](ai-agent-vision.md#4-what-is-actually-hard-ranked) explains why.

---

## Phase 2 — Agent, on small projects

**Goal: prove the loop.** Three files, one deliberate error, agent fixes the build.

| | Work |
|---|---|
| 2.1 | Agent runtime with tools: `list_files`, `read_file`, `write_file`, `compile`, `read_log` |
| 2.2 | Iterate until clean, bounded by a per-task ceiling (compiles, tokens, wall-clock) |
| 2.3 | Diff review — every change visible before it lands, nothing silent |
| 2.4 | Task cancellation, keeping partial work |
| 2.5 | Task transcript: what it did, which files, how many builds |
| 2.6 | **Cost telemetry per task** — tokens, compiles, wall-clock, money |
| 2.7 | Wire the existing chat panel and selection actions to the real agent |

**Done when:** a deliberately broken three-file project is repaired autonomously, and you
know what that cost.

> 2.6 is not optional and not "later". Without cost per task you cannot price the plans, and
> pricing blocks Phase 4.

---

## Phase 3 — Large projects

**Goal: the differentiator.** This is where competitors fail and where the product earns
its claim.

| | Work |
|---|---|
| 3.1 | Project index: `\input` graph, `\label`/`\cite` map, section tree |
| 3.2 | Structural navigation — the agent finds "section 3.2" without reading 60 files |
| 3.3 | Selective context: load what the task needs, not the project |
| 3.4 | Cross-file operations: rename a concept everywhere, fix every reference |
| 3.5 | Citation safety — never invent a reference, verify every key against the `.bib` |
| 3.6 | Benchmark: a real 100-page, 60-file thesis with a cross-cutting change |

**Done when:** the benchmark in
[requirements.md §7](requirements.md#7-success-metrics) passes, and beats Prism and
Overleaf's assistant on the same task.

---

## Phase 4 — Billing

**Goal: charge for the agent.** Deliberately after Phase 2 and 3, because the price depends
on the cost data those phases produce.

| | Work |
|---|---|
| 4.1 | Plan model: Free, Pro, Max — compilation unlimited on all three |
| 4.2 | Stripe Checkout and subscriptions |
| 4.3 | Webhook → entitlement; subscription state authoritative in our own database |
| 4.4 | Agent task metering: count, enforce the monthly limit, show what remains |
| 4.5 | Billing portal: upgrade, downgrade, cancel, invoices |
| 4.6 | Graceful limit behaviour — a user who runs out keeps compiling, and keeps their work |

**Done when:** a user can subscribe, spend their tasks, hit the limit without losing
anything, and upgrade.

---

## Phase 5 — Templates as a product

**Goal: the secondary revenue line.** First-party only.

| | Work |
|---|---|
| 5.1 | Template catalogue: browse, preview, search, categorise |
| 5.2 | Premium templates — one-time purchase, permanent access, independent of subscription |
| 5.3 | Entitlement checks on use |
| 5.4 | Produce the launch set (10–15 templates; which are premium is an open question) |

---

## Phase 6 — Trust and scale

Needed before any public launch. **Parts of this cannot wait for Phase 6** — the security
items are marked where they must land earlier.

| | Work | When |
|---|---|---|
| 6.1 | **Secure cookies** — currently disabled deliberately | Before any public deployment |
| 6.2 | **Rate limiting on auth** | Before any public deployment |
| 6.3 | **CI running the 243 tests** | Immediately — it is cheap and everything else depends on not breaking |
| 6.4 | Tests against Postgres, not SQLite | With CI |
| 6.5 | Password reset, email verification | Before public launch |
| 6.6 | Horizontal scaling: migration lock, connection pool sizing, queue autoscaling | When the queue backs up |
| 6.7 | Database backups | Before real user data exists |
| 6.8 | Project deletion | Before public launch — users expect to delete their data |

---

## Explicitly later

Not rejected, just not now. Listed so they stop being re-proposed.

| | Why not now |
|---|---|
| **Realtime collaboration** | Large build, and the single-owner model is sufficient for a thesis writer |
| **Third-party template sellers** | Adds seller onboarding, payouts, moderation and disputes. Only if first-party supply cannot meet demand |
| **Mobile apps** | The editor is desktop work |
| **Snapshot pruning** | Storage grows per save; watch it, act when it matters |
| **Recursive-CTE tree queries** | Current per-level queries are fine until trees reach thousands of entries |

---

## The risks that decide this plan

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Compile infrastructure is harder than expected** | Phase 1 blocks everything | Start it first; treat it as the real project |
| **Cost per agent task exceeds the subscription** | The business inverts | Measure from Phase 2.6; hard per-task ceilings |
| **Free compilation costs real money at zero revenue** | Free users are a pure cost centre | The agent subscription must carry them; keep compiles efficient |
| **An incumbent ships this first** | Overleaf has the compile infrastructure already — they need only add the agent, which is the easier half | Move fast on Phase 1–3; the benchmark is the proof |
| **Agent damages someone's thesis** | Fatal to trust, in the most reputation-sensitive user base there is | Diff review, append-only snapshots, never invent citations |

The fourth one deserves a clear-eyed look: **you are building the hard half first and the
easy half second, while the incumbent already has the hard half.** The answer is not to
skip Phase 1 — it is to be better at Phase 3 than a feature team bolting AI onto an
existing editor will be.
