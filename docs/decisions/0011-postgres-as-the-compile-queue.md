# ADR 0011: Postgres is the compile queue

**Status:** Accepted
**Supersedes the queue choice sketched in** [the Phase 1 plan](../plans/latex-compilation.md),
which proposed Redis with RQ.

## Context

Compilation has to be a job rather than inline work in a request handler: a cold
215-page thesis build measured 35.9 s and holds a CPU core for all of it. So Phase 1 needs a
queue, and the obvious choice is Redis with RQ — mature, synchronous, batteries included, and
a natural fit for a codebase whose handlers are all sync `def`.

Three things argue the other way.

**The job row already exists and is already authoritative.** `compile_jobs` is what the API
polls to answer "is my build done?". Putting the queue in Redis means the same job lives in
two stores that can disagree — a crashed worker, a lost Redis key or a replayed message each
produce a divergence that has to be reconciled. Postgres as the queue has one copy.

**The load does not need Redis.** At the Phase 1 target of ~100 concurrent users compiling
every couple of minutes, arrivals are **under one job per second**. `SELECT ... FOR UPDATE
SKIP LOCKED` handles orders of magnitude more than that, and is the pattern behind
graphile-worker, river, que and Oban.

**There is no CI yet.** Adding a service to run, deploy, monitor, back up and secure, before
anything runs the tests automatically, is the wrong order.

## Decision

**Claim jobs with `SELECT ... FOR UPDATE SKIP LOCKED` against `compile_jobs`.** No Redis, no
RQ, no broker.

- `claim_next_job` takes the oldest `queued` row and flips it to `running` in one transaction.
  Several workers can pull from the table without coordinating.
- `SKIP LOCKED` is applied **only on Postgres**. The test suite runs on SQLite, which does not
  support it and does not need it — tests are single-threaded.
- `reap_stale_jobs` fails rows stuck in `running` past twice the compile deadline. A worker
  killed between claiming and finishing would otherwise leave a job `running` for ever.

## Consequences

- **One store, one truth.** The status the API serves is the same row the worker locked.
  There is no reconciliation path to get wrong.
- **One less service.** Nothing to deploy or monitor, and the queue is backed up and restored
  with the database.
- **We own what RQ would have given us.** Retries, heartbeats and a dashboard are not free any
  more. `reap_stale_jobs` is the heartbeat substitute, and it is also the wall-clock backstop
  that M7 needs regardless — but there is **no retry and no dashboard**, and adding either is
  our work.
- **Workers consume database connections by polling.** With SQLAlchemy's default
  `pool_size=5` + `max_overflow=10` = 15 connections against 40 anyio threads, raising the pool
  stops being advisable and becomes required before workers run alongside the API.
- Polling adds latency up to `COMPILE_POLL_SECONDS` (default 2 s) before a job starts.
  `LISTEN`/`NOTIFY` removes that when it matters; it is not worth the code until someone
  notices the delay.

### What would make this wrong

- Arrival rates far above the Phase 1 target, where polling pressure on the primary database
  starts competing with serving requests.
- Needing fan-out, priorities or scheduled retries with backoff — at which point a real broker
  earns its keep rather than being adopted on reflex.
