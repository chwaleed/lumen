# Implementation plan: LaTeX compilation

**Roadmap:** [Phase 1](../product/roadmap.md#phase-1--compile), items 1.1–1.8
**Decisions:** [ADR 0008](../decisions/0008-latex-compiler-stack.md)
**Research:** [latex-compiler-selection.md](../research/latex-compiler-selection.md)
**Status:** Not started

## Goal

A user presses Compile and gets a PDF. A broken document gives an error they can click.
**No AI in this phase.**

**Done when** a real multi-file thesis — 60+ files, bibliography, TikZ, a university class
file — compiles to a correct PDF, and a deliberately broken document produces a parsed error
that navigates to the right line.

This phase is systems engineering, not AI, and it is the largest single risk in the plan.
Everything else in the product depends on it, because an agent with no compiler cannot check
its own work.

---

## Progress

| | Milestone | Status |
|---|---|---|
| **M0** | Measure first | ✅ **Done** — 2026-10-06/07 |
| **M1** | Compile by hand, no application | ✅ **Done** — 2026-10-07 |
| **M2** | Compile service, worker and CLI | ✅ **Done** — 2026-10-07 |
| **M3** | API | ✅ **Done** — 2026-10-07 |
| **M4** | PDF in the editor | ✅ **Done** — 2026-10-08 |
| **M5** | Parsed errors and navigation | ✅ **Done** — 2026-10-08 |
| **M6** | Non-image uploads | ✅ **Done** — 2026-10-08 |
| **M7** | Fair use and operations | ⬜ **Next** — last one |

Three M0 measurements remain genuinely open and are **deliberately not ticked**: the gVisor
comparison (needs root and a non-Snap Docker host), a dedicated-host concurrency knee, and a
run against real theses rather than the generated corpus. See [M0's own list](#still-open).

---

## ✅ M0 — Measure first — **DONE (2026-10-06/07)**

Measured on the dev machine: 12 cores, 23 GB RAM, `texlive/texlive:latest` (TeX Live 2026).
**Caveat on every number: ~20 other containers were running** (Postgres, the Supabase stack),
so these are shared-host figures, not clean dedicated-host ones. Treat them as a floor.

Corpus: a generated 215-page thesis across **72 files** (10 chapters × 6 sections,
`biblatex`+`biber` with 45 entries, TikZ, pgfplots, theorems, longtables, index), a small
article, and 9 deliberately broken documents.

### Timings — 215-page thesis, 1 core, 1 GB, full hardening

| Engine | Full build (`latexmk`, all passes) | Check profile (1 pass, `-draftmode`) |
|---|---|---|
| **pdfLaTeX** | **35.9 s** | **7.0 s** |
| **XeLaTeX** | **36.0 s** | 7.5 s |
| **LuaLaTeX** | 5.2–6.6 s/pass, needs a writable cache (below) | — |

Small 2-page article, for comparison: pdfLaTeX 1.3 s full / 0.66 s check, XeLaTeX 1.7 s,
LuaLaTeX 1.06 s.

**A cold single pass is 5× faster than a cold full build** — but see the incremental
measurements below: this gap is latexmk doing 3–4 passes plus biber plus makeindex on
unconverged references, and it **does not survive into the warm case**, which is what the
agent actually does.

**XeLaTeX is not slower than pdfLaTeX on a real document** — 36.0 s vs 35.9 s. The widely
repeated "pdfLaTeX is 2× faster" claim measures engine *startup* on a hello-world, which is
noise at thesis scale. pdfTeX remains the right default for compatibility and for LLM
training distribution, but **not on speed grounds** at this document size.

Warm-rebuild numbers are **not reported**: latexmk keys off its `.fdb_latexmk` database, not
mtimes, so `touch` does not force a rebuild and the figures were measuring a no-op.

### Incremental rebuild — the number that actually prices the agent

Measured after a converged full build, by appending a sentence to one section file of 72:

| Operation | Time |
|---|---|
| Cold full build (converges aux + biber + index) | 34.2 s |
| `latexmk` no-op, nothing changed | **0.44 s** |
| **Full `latexmk` rebuild after a one-file edit** | **6.8–8.2 s** |
| Single-pass `-draftmode` rebuild after a one-file edit | 7.6–8.4 s |

**The check profile is not faster warm — it is marginally slower.** This removed the
two-profile design; see [ADR 0010](../decisions/0010-one-compile-profile.md). The 5× cold win
was latexmk doing 3–4 passes plus biber plus makeindex on unconverged references, not
`-draftmode`.

`-draftmode` measured directly on a deliberately image-heavy document (30 PNGs, 23 MB) saved
**13%** — 697 ms against 604 ms — not the 5–10× that circulates online. pdfTeX passes raster
images through without recompression, so there is little to skip.

**So an agent iteration costs ~7 s, and 20 iterations ~140 s plus one cold build.** That is
the figure to price plans against. It depends entirely on the per-project `.aux`/`.fdb_latexmk`
cache surviving between compiles: **lose the cache and every iteration costs 36 s, not 7 s.**

### Container overhead and image

| | |
|---|---|
| `docker run` create → run → teardown | **261 ms** median (12 runs, min 235, max 292) |
| Image size | **8.41 GB uncompressed** (2.56 GB compressed). The TeX tree is 4.8 GB |
| Cold pull | **35 min 1 s** at 1.25 MB/s |
| Hardened `lumen-tex` image on top | **+30 MB** |

261 ms is the floor under every compile, so a 20-iteration agent task pays ~5 s in container
churn alone. It does not justify warm pools on its own — 261 ms against a 7 s check compile
is under 4%.

**The 35-minute cold pull does matter for autoscaling**: a new worker is unavailable for
tens of minutes unless the image is pre-baked into the machine image or served from a local
registry mirror.

### Concurrency knee

Check-profile compiles of the 215-page thesis, each capped at 1 core, on 12 shared cores:

| Concurrent | Median job | Max job | Throughput |
|---|---|---|---|
| 1 | 8.9 s | 8.9 s | 6.7 /min |
| 2 | 7.9 s | 7.9 s | 15.2 /min |
| **4** | **9.2 s** | 9.4 s | **25.5 /min** |
| 8 | 14.6 s | 15.1 s | 31.9 /min |
| 12 | 19.5 s | 20.3 s | 35.4 /min |

**The knee is at ~4 concurrent compiles on 12 cores.** Past it, latency degrades faster than
throughput improves: 8 concurrent costs 1.6× the latency for 25% more throughput, 12
concurrent costs 2.2× for 11%.

**Budget roughly one compile per 3 cores, not one per core.** `--cpus=1` does not make a
compile one core's worth of load — memory bandwidth and I/O contend. This revises the
capacity arithmetic upward by about 3×, and it is the number to re-measure on a dedicated
host before sizing anything.

> **Business consequence, stated plainly.** A thesis full build is ~36 s of CPU. Unlimited
> free compilation of thesis-sized documents is therefore materially more expensive than the
> earlier sizing assumed, and this is very likely why Overleaf's free tier stops at a 10 s
> timeout — **our corpus cannot be compiled on Overleaf free at all.** The model still works,
> but it depends on warm-cache rebuilds (~7 s, below) rather than cold ones, and on
> fair-use concurrency mattering more than expected. Feed this into
> [requirements.md §6](../product/requirements.md).

### Security findings — all three are real and reproducible

**1. Environment variables leak into the compile log.** A document containing
`\input{/proc/self/environ}` put a canary secret straight into `main.log`, which we return
to users.

> **Requirement:** the compile container must never receive secrets as environment
> variables. No `S3` keys, no `DATABASE_URL`, no `JWT_SECRET_KEY`. This is not a hardening
> nicety — it is a disclosure bug waiting to be written.

**2. `openin_any = p` does not stop `\input`.** Set it, verify it with `kpsewhich`, and
`\input{/etc/passwd}` still typesets the file into the PDF. Measured on the hardened image:

| Attack | Result |
|---|---|
| `\input{/etc/passwd}` (absolute) | **LEAKED** |
| `\input{../../../../etc/passwd}` (traversal) | **LEAKED** |
| `\openin` of `/etc/passwd` | blocked |

`openin_any` governs `\openin` only. **The container is the only barrier against file
disclosure**, which makes the sandbox load-bearing rather than defence-in-depth, and makes
"what is readable inside the image" a security boundary.

**3. Killing `docker run` does not kill the container.** A host-side timeout killed the
client while the container kept running and wrote a **186 MB log file** into the project
directory. Two requirements fall out:

- The supervisor must `docker kill` **by container name**. Killing the client is not a
  timeout. (Verified working: a 20 s deadline now terminates the container.)
- **The output directory needs its own size cap.** The tmpfs caps protected `/tmp` and
  `HOME`; the writable project mount was uncapped, which is where the 186 MB went.

### The font-cache trap — worth 10× on Xe/Lua

LuaLaTeX took **11.2 s on a two-page article**. Cause: luaotfload's cache root is
`$HOME/.texlive2026/...`, and `HOME` is a fresh tmpfs each run, so it rebuilt the font
database on every compile and ignored the cache baked into the image.

| Configuration | LuaLaTeX, 2-page article |
|---|---|
| `HOME` on throwaway tmpfs (naive) | 11,183 ms |
| `TEXMFCACHE` → image's baked cache | **1,055 ms** — 10.6× faster |

XeLaTeX showed the same effect: 5.4 s → 1.7 s once caches were baked into the image.

**But a read-only cache is not enough.** With `TEXMFCACHE` pointing at the read-only image
path, LuaLaTeX **fatally fails** on the real thesis inside `luaotfload-init` when it needs to
write an entry. The working configuration is a **writable cache, pre-seeded from the image**
(41 MB), which produced a PDF in 5.2–6.6 s per pass.

> **Design consequence.** The compile container needs a writable, persistent, pre-seeded font
> cache — not a tmpfs, and not a read-only mount. Keyed per worker is acceptable *while only
> system fonts are involved*, because the cache is derived from image content. **The moment
> users can upload fonts it becomes tenant data and must be keyed per project.** Decide this
> before M6 allows font uploads.

### Shell-escape allowlist — the published lists are wrong

Read out of the shipped `texmf.cnf` (TeX Live 2026), 13 entries, not the 8 published:

```
bibtex, bibtex8, extractbb, gregorio, kpsewhich, l3sys-query, latexminted,
makeindex, memoize-extract.pl, memoize-extract.py, repstopdf, r-mpost,
texosquery-jre8
```

**`latexminted` is on the allowlist**, and testing on fresh directories settled the question:

| Configuration | minted |
|---|---|
| `shell_escape = f` (ADR 0008's original choice) | **fails** — "Cannot highlight code", PDF produced but unhighlighted, errors in the log |
| `shell_escape = p` (restricted), no flag | **works fully** — cache written, no errors |

`\immediate\write18{...}` of an arbitrary command stays **blocked** under restricted mode.
Combined with `\input` already being unrestricted (above), this reversed the decision — see
[ADR 0009](../decisions/0009-use-restricted-shell-escape.md). **`minted` works; the `listings`
fallback is not needed.**

Defaults as shipped, confirmed: `shell_escape = p`, **`openin_any = a`**, `openout_any = p`.

### Snap Docker is unusable for this — three independent failures

Docker here is Snap-installed (`/snap/bin/docker`, v29.8.0):

| Failure | Effect |
|---|---|
| `/tmp` bind-mounts **silently mount empty** | Snap has a private `/tmp`; the container sees nothing |
| `--security-opt=no-new-privileges` **breaks exec** | Reproduced on `alpine` too, so it is the host, not the image |
| Redirecting Docker's stdout to a file **makes the run fail** | 0 bytes written, non-zero exit. Pipes work; redirects do not |

**Production must use Docker CE or Podman.** Overleaf documents the same Snap incompatibility
for its own sandboxed compiles. For local development, keep the compile workspace under
`$HOME`, never `/tmp`.

### Engines confirmed present

pdfTeX 1.40.29, XeTeX 0.999998, LuaHBTeX 1.24.0, `latexmk` 4.88 (9 Mar 2026), biber 2.22,
bibtex, makeindex — all TeX Live 2026. **`pdfinfo` is absent**, so take page counts from the
engine's own `Output written on ... (N pages` log line.

**biber needs a large writable temp.** It is par-packed Perl that unpacks itself at runtime
and fails with "No space left on device" on a 64 MB tmpfs. **512 MB `/tmp` works.** A silent
bibliography failure is exactly the kind of bug that reaches a user as "my citations are
`[?]`".

### Still open

- [ ] **gVisor comparison not run.** `runsc` is not installed, the host has no passwordless
      sudo, and this machine's Snap Docker could not host it anyway. Needs a Docker CE host
      and an interactive install. This is the measurement that decides whether strong
      isolation is affordable, and ADR 0008's "gVisor before public launch" stays unverified
      until it runs.
- [ ] Re-measure the concurrency knee on a **dedicated** host; these figures share a box with
      ~20 containers.
- [ ] Measure with **real** theses rather than a generated corpus. The generated one is
      structurally realistic but its content is `lipsum`.

## ✅ M1 — Compile by hand, no application — **DONE (2026-10-07)**

Lives in [`compile/`](../../compile/). Three files, no application code:

| File | What it is |
|---|---|
| [`compile/Dockerfile`](../../compile/Dockerfile) | The image: pinned TeX Live, hardened `texmf.cnf`, caches baked |
| [`compile/compile.sh`](../../compile/compile.sh) | **The exact command the M2 supervisor shells out to.** Nothing else should build a `docker run` for LaTeX |
| [`compile/verify.sh`](../../compile/verify.sh) | The sandbox regression suite. Re-run after every TeX Live upgrade |

```bash
cd compile && docker build -t lumen-tex:latest . && ./verify.sh
./compile.sh --work /path/to/project --root main.tex --engine pdflatex
```

### Pinned by digest, not tag

```
FROM texlive/texlive@sha256:a7ae4dfa9d521b5db14446872fa488b839021d1f604d0a3c74461784895f2a67
```

The multi-arch index for `texlive/texlive:latest` on 2026-10-06, carrying linux/amd64 and
linux/arm64. **No immutable dated tag exists** for the current release, so the digest is the
only reproducible reference. Upgrading TeX Live means editing that line deliberately and
re-running `verify.sh`.

### Verification — 12/12

| | Check | Result |
|---|---|---|
| ✅ | `shell_escape`, `openin_any`, `openout_any` all `p` | as built |
| ✅ | Arbitrary `\write18` | refused |
| ✅ | `\openin` of `/etc/passwd` | blocked |
| ⚠️ | `\input{/etc/passwd}` | **succeeds, by design** — `openin_any` governs `\openin` only. The container is the only barrier, and `verify.sh` flags it if upstream ever changes |
| ✅ | Credential-shaped variable in the environment | none present |
| ✅ | Runaway loop | killed by the deadline at 15 s, `rc=124` |
| ✅ | Log bomb | **capped at 100 MB by `--ulimit fsize`** |
| ✅ | Container after a kill | none survived |
| ✅ | `minted` under restricted shell escape | **highlights correctly** — [ADR 0009](../decisions/0009-use-restricted-shell-escape.md) validated end to end |
| ✅ | A real document with TikZ, refs and equations | PDF produced |
| ✅ | SyncTeX | `t.synctex.gz` written |

### Two things M1 added that M0 had not solved

**`--ulimit fsize=104857600`.** M0 found an uncapped project mount take a 186 MB log. One
flag caps any single file at 100 MB — no root, no quota, no tmpfs gymnastics. Verified.

**`verify.sh` fails loudly rather than silently passing.** The first run reported PASS on
every attack check while nothing had compiled at all, because `mktemp -d` put the work
directory in `/tmp` and Snap Docker mounts `/tmp` binds empty — M0's own finding, walked into
while writing the suite. There is now a preflight that proves the bind mount is visible, and
every check asserts a log exists before judging. **A security check that passes because
nothing ran is worse than no check.**

> On a Snap Docker host, run `TMPDIR="$HOME" LUMEN_SECOPT= ./verify.sh`. `LUMEN_SECOPT=`
> drops `no-new-privileges`, which Snap breaks. Neither workaround is needed on Docker CE,
> and production must not use Snap.

## ✅ M2 — Compile service and worker, driven from a CLI — **DONE (2026-10-07)**

No HTTP. A job can be created, claimed, compiled and recorded end to end.

```bash
cd backend && python -m src.compiles.cli <project_id> [--engine pdflatex] [--root main.tex]
```

| Module | What it does |
|---|---|
| `src/compiles/models.py` | `CompileJob`, statuses, engine list. Plus `projects.engine` |
| `src/compiles/service.py` | Materialise a project to disk; create, claim and reap jobs |
| `src/compiles/worker.py` | The supervisor: claim → materialise → `compile/compile.sh` → collect → record |
| `src/compiles/cli.py` | Submit one job and run it inline — M2's acceptance check |

`router.py` and `schemas.py` arrive with M3; empty files now would be boilerplate.

### Verified end to end

A seeded multi-file project (`main.tex` + `sections/intro.tex` + `sections/body.tex` +
`refs.bib`, with `\input`, `\cite` and `\autoref`):

| Run | Result |
|---|---|
| **Cold** | `success`, exit 0, **2,438 ms**, 0 errors, PDF + log + synctex written |
| **Warm** (same project, second run) | `success`, **336 ms** — **7× faster** |
| Bibliography | **0 undefined references or citations** — bibtex ran and resolved |

The warm figure is the thing to watch: it comes from `main.aux`, `main.bbl` and
`main.fdb_latexmk` surviving in the per-project work directory, which is exactly the
dependency [ADR 0010](../decisions/0010-one-compile-profile.md) flagged as load-bearing.

### Decisions taken here

**The queue is Postgres, not Redis** — `SELECT ... FOR UPDATE SKIP LOCKED` against
`compile_jobs`. This replaces the Redis/RQ sketch this plan originally carried; see
[ADR 0011](../decisions/0011-postgres-as-the-compile-queue.md). `SKIP LOCKED` is applied only
on Postgres, since the test suite runs on SQLite and is single-threaded.

**The work directory is per project, not per job.** Reused across compiles so latexmk's
artifacts survive. A `.lumen-manifest` records what was materialised, so a file deleted from
the project is pruned on the next run while latexmk's own artifacts are left alone.

**Outputs go to the local filesystem** (`COMPILE_OUTPUT_DIR`), with relative paths on the job
row. Marked `ponytail:` in `models.py` — Phase 1 targets one machine, and moving to S3 is a
change at one call site in `worker.py` once compile workers are split from the API.

**Materialisation rejects unsafe names rather than sanitising them.** User-supplied names are
written to disk, so `..`, `/`, `\` and empty names raise. A silently renamed file breaks
`\input` in a way the user cannot see.

### Found while building it

- **The alembic head was `20260425_0001`, not the newest-looking file.** Branching off
  `c8f6d85d350f` created two heads and migrations refused to run. Check
  `down_revision` against the real head, not the filename order.
- **The worker must inherit its own environment**, because `docker` lives in `/snap/bin` here
  and a restricted `PATH` broke the first run. This does not widen what a document can read:
  `compile.sh` passes only the `TEXMF*` variables into the container, which `verify.sh` checks.
- `COMPILE_SECURITY_OPT` is a setting rather than an environment read, per CLAUDE.md. Set it
  empty only on a Snap Docker host.

### Tests

25 new, in `backend/tests/unit/compiles/`. **Backend total 123, all passing.** None need
Docker: path building, unsafe-name rejection, root-file resolution, manifest pruning,
artifact survival, queue claiming, double-claim prevention, stale reaping, error counting.

## ✅ M3 — API — **DONE (2026-10-07)**

Five endpoints in `src/compiles/router.py`, all ownership-scoped and returning **404, not
403**, for another user's project or job
([ADR 0003](../decisions/0003-return-404-for-another-users-resource.md)).

```
POST   /projects/{id}/compile[?root_file_id=]  → 202, the queued job
GET    /projects/{id}/compile/{job_id}         → status, timings, error count
GET    /projects/{id}/compile/{job_id}/log     → raw log + error count
GET    /projects/{id}/compile/{job_id}/pdf     → the PDF bytes
DELETE /projects/{id}/compile/{job_id}         → cancel a queued compile
```

### Verified over HTTP, with the real worker and real Docker

| Step | Result |
|---|---|
| `POST /compile` | **202**, `status=queued` |
| worker `run_once()` | `success`, **1,418 ms**, exit 0 |
| `GET /compile/{id}` | 200, `has_pdf=true`, `error_count=0` |
| `GET /compile/{id}/pdf` | 200, `application/pdf`, 29,139 bytes, `%PDF-` magic |
| `GET /compile/{id}/log` | 200, 10,793 chars, 0 undefined references |
| Same PDF, different user | **404** |

### Decisions taken here

**The PDF endpoint is the one exception to the response envelope.** Everything else returns
`{success, message, data}` via `ApiResponseBuilder`, per CLAUDE.md. A PDF is bytes: wrapping
it would mean base64, a third more payload, and a decode step before `pdf.js` could open it.
The exception is marked in the router so it reads as a decision rather than an oversight.

**`DELETE` cancels a *queued* compile only; a running one is 409.** The container name lives
in the worker process, so stopping a running compile needs the row to carry that name and the
API to kill it — that is M7's "cancel a running job and reap its container". Marking the row
cancelled now would race the worker's own write and report something untrue.

**The log endpoint returns the raw log.** Parsed `(file, line, severity, message)` is M5's
job; until it exists the client shows the engine's own output rather than a wrong guess.

**Output paths are resolved against the output directory and refused if they escape it.**
`output_path()` resolves and checks containment — the stored path is ours, but it reaches the
filesystem, so it is treated as a boundary.

### The pool is raised

`pool_size=20`, `max_overflow=20` — 40 connections, matching the anyio threadpool, settable
via `DB_POOL_SIZE` / `DB_MAX_OVERFLOW`, plus `pool_pre_ping`. SQLAlchemy's default of 15 was
the real ceiling, and [ADR 0011](../decisions/0011-postgres-as-the-compile-queue.md) made
fixing it mandatory rather than advisable, because workers now poll the same database. The
sizing applies to Postgres only: SQLite does not use a `QueuePool`.

### Tests

13 new API tests in `backend/tests/api/compiles/`. **Backend total 136, all passing.** They
cover the 202, cross-user 404s on both project and job, a folder rejected as a compile root,
a root file from another project, an empty log before the worker runs, a 404 PDF before one
exists, PDF bytes served with the right content type, cancellation, 409 on a running job, and
409 on a double cancel.

> Settings named in the original sketch that no longer exist: `REDIS_URL` (there is no Redis —
> ADR 0011), `COMPILE_TMPFS_MB` (fixed in `compile.sh`, where the 512 MB that biber needs is
> not a per-request choice). `COMPILE_MAX_CONCURRENT_PER_USER` and `COMPILE_MAX_PROJECT_BYTES`
> belong to M7 with the rest of fair use.

## ✅ M4 — PDF in the editor — **DONE (2026-10-08)**

The first user-visible change in Phase 1: press Compile, get a PDF.

### Components

`app/project/[id]/components/preview-panel/` — a folder, per the component standards, with
one export named after it:

| File | Responsibility |
|---|---|
| `preview-panel.tsx` | Composition root: header, status, PDF-or-log switch |
| `pdf-viewer.tsx` | The viewer |
| `compile-status.tsx` | Status badge, replacing the fake "Auto-compile On" |
| `compile-log.tsx` | Raw log when a build fails |
| `preview-empty-state.tsx` | Before the first compile, and while one runs |

`app/project/[id]/use-compile-hook.ts` is a **separate** Zustand store from
`use-project-editor-hook`, which is already 895 lines. Compilation has its own lifecycle
(queue → poll → settle) and needs none of the editor's file or tab state.

Four proxy routes under `app/api/projects/[id]/compile/`, so the browser never reaches port
9000 directly.

### The viewer is an iframe, not pdf.js

This plan originally said pdf.js or react-pdf. **It uses the browser's own viewer instead** —
Chrome and Firefox both ship one with page navigation, zoom, search and print, and the proxy
route is same-origin so the session cookie rides along. That is **zero new dependencies** for
the feature the milestone exists to deliver.

Reach for pdf.js when we need what the built-in viewer cannot do: SyncTeX click-to-source, or
drawing error markers over the page. Both are M5 and later, and `pdf-viewer.tsx` is the one
file that changes.

### The PDF proxy needed a binary path

`fetchBackendWithAuth` is axios-and-JSON shaped, so `fetchBackendBinaryWithAuth` was added
alongside it rather than bolting a mode flag onto the shared helper — the two return
different shapes, and one function returning either reads worse than two that each do one
thing. It repeats the refresh-on-401 dance, which is the cost of that choice.

### Polling backs off

`[400, 600, 900, 1400, 2000, 3000]` ms. A warm rebuild lands in ~1.4 s and a cold one takes
~36 s, so a fixed fast interval would be mostly wasted requests. The loop checks the job id
on every tick and abandons its own if a newer compile has superseded it, rather than writing
a stale status over the new one.

### What was removed

**The "Auto-compile On" badge is gone.** It was a label for a feature that did not exist, and
[ai-agent-vision.md §9](../product/ai-agent-vision.md) is right that shipping one trains users
not to believe the interface. The badge now reports what actually happened: queued,
compiling, compiled in 1.4 s, 2 errors, timed out, cancelled.

Both dead PDF buttons are wired. Compile queues and shows a spinner; Export PDF is a plain
`<a download>` to the proxy route, disabled until a PDF exists — the browser saves bytes the
route already serves, so nothing is held in memory.

### Verified

Typecheck clean, `bun run lint` clean, production build succeeds with all four routes
registered, semantic tokens only (no raw palette values or hex), kebab-case filenames.

**13 new unit tests** in `frontend/tests/unit/compile/`, **frontend total 130, all passing**:
poll-to-success, log fetched on failure but not on success, the in-flight guard, a refused
submission, the superseded-job guard, cancellation, and a refused cancellation.

The shared `axios-mock` gained `respondInOrder` / `respondInOrderWithApi`, because a flow that
POSTs and then polls needs a sequence rather than one queued response.

> **Gap, stated plainly: no e2e test for this yet.** `frontend/tests/e2e/compile/` would need
> the backend, a running worker and Docker all up, which is a `@backend`-tagged test this
> milestone did not stand up. Writing one that cannot be verified would be worse than
> recording the gap.

## ✅ M5 — Parsed errors and navigation — **DONE (2026-10-08)**

`backend/src/compiles/log_parser.py`, plus a problem list in the preview panel that opens the
file and puts the cursor on the line.

### Tested against real engine output, not hand-written logs

Eight log fixtures in `backend/tests/unit/compiles/fixtures/`, produced by running the broken
corpus through the actual pinned image. **7/7 of the error classes now resolve correctly**, up
from the M0 prototype's 6/7.

| Fixture | Located at |
|---|---|
| `undefined_command` | `undefined_command.tex:4` |
| `missing_dollar` | `:4` — the cascade's first entry |
| `bad_environment` | `:6`, message rejoined across the wrap |
| `nested_error` | **`sections/bad.tex:1`** — the subfile, not `main.tex` |
| `missing_package` | `:2` — the `\usepackage`, recovered from the sources |
| `unbalanced_brace` | file recovered, **line honestly `null`** |
| `undefined_reference` | 0 errors, 2 warnings at line 4 |
| `clean` | nothing |

### Two things the M0 prototype got wrong

**TeX hard-wraps the log at exactly 79 columns, mid-sentence.** `bad_environment` splits as
`"... ended by "` / `"\end{enumerate}."`, so every pattern has to run over rejoined lines.
The first implementation of `unwrap` was subtly broken — it tested the *joined* length, so
once a line passed the margin it swallowed the rest of the log, collapsing 150 lines into 1.
The continuation flag has to come from the chunk TeX just emitted.

**Unlocated errors often have an `l.<N>` marker a few lines below**, and a `<*> <file>` marker
naming the file. That is how `unbalanced_brace` now gets a file where the prototype got
nothing. For a missing package `l.<N>` is *approximate* — TeX reports where it noticed, line
3, not the `\usepackage` on line 2 — so for that class a source scan wins and is preferred.

### Follow-on suppression is the part that prevents wrong answers

`Emergency stop` and `==> Fatal error` are logged **wherever TeX gave up, not where the fault
is**. `missing_package` proves it: the stop is line 3, the cause line 2. Reporting them is
exactly how a parser sends an agent to fix the wrong line, so they are dropped rather than
ranked.

### Honest limits

- **Cascades are ranked, not fully collapsed.** Exact duplicates are dropped, but one missing
  `$` can log at two adjacent lines (the `^`, then the paragraph end). The end-to-end check
  returns 3 errors for 2 faults. The first is still the right one, and a heuristic that
  collapsed same-message adjacent lines could hide a genuine second fault — a worse trade than
  a little noise.
- **Parsed on read, not stored.** The log is the source of truth, so improving the parser
  improves old jobs with no migration. `error_count` on the row now comes from the parser
  rather than a raw regex.
- Overleaf's parser was not needed, so its licence never had to be checked.

### Navigation

`compile-errors.tsx` lists errors first, then warnings behind a count. Clicking resolves the
diagnostic's path through the file tree (`findNodeByPath`), opens the file and calls Monaco's
`revealLineInCenter`. A diagnostic with no file is shown but not clickable — it says
`location unknown` rather than pretending.

The preview panel now has three panes — **PDF, Problems, Log** — and with no explicit choice
it follows the compile: the PDF when there is one, the problems when the build failed.

### Verified end to end

A project whose `main.tex` `\input`s a broken subfile: compile failed, and the API returned
the first error as **`sections/bad.tex:1`** with no follow-on noise.

### Tests

22 parser tests, 1 API test for the diagnostics shape, 8 for `findNodeByPath`, 2 more for the
hook. **Backend 159, frontend 139 — all passing.** Lint clean, production build succeeds.

## ✅ M6 — Non-image uploads — **DONE (2026-10-08)**

Before this, **only images could be uploaded, so no real project could build.** A thesis
needs its `.bib`, and a journal submission needs the publisher's `.cls`.

### The allowlist is extension-driven, not MIME-driven

Browsers report `""` or `text/plain` for `.sty`, `.cls` and `.bst`, so a content-type
allowlist would have rejected exactly the files the milestone exists to allow. The extension
decides, and **the content type is derived from it** rather than taken from the client.

| Allowed | |
|---|---|
| Compiler assets | `.bib` `.cls` `.sty` `.bst` `.cfg` `.clo` `.def` `.ldf` |
| Figures | `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` `.pdf` `.eps` |

**`.tex` is deliberately excluded.** The editor owns `.tex` through snapshots; one uploaded
to S3 would be read back from there and so be uneditable. The rejection message names the
extension and lists the allowed ones, so nobody has to guess.

### The size ceiling is enforced, not merely declared

`ContentLength` is **signed into the presigned URL**, so S3 refuses a body of any other
length. Without that, the ceiling would rest on the client telling the truth about how big
its file is.

- Per file: `UPLOAD_MAX_FILE_BYTES`, default 25 MB
- Per project: `PROJECT_MAX_BYTES`, default 200 MB, summed over a new
  `file_entries.size_bytes` column

The column is trustworthy precisely because of the signature: a client cannot under-declare a
size, upload more, and quietly grow the project past its ceiling.

### Safety kept from before

Directory components are still stripped — `../../../etc/passwd.png` becomes `passwd.png`, and
the object key stays inside `uploads/<project>/`. A name that reduces to nothing is rejected.

> These files are **untrusted input that the compiler then executes**, which is why this
> milestone was gated behind M1's verified hardening rather than shipped alongside it.

### Verified with a real compile

`tests/integration/compiles/test_uploaded_assets.py` puts a custom `.sty` in a moto-backed S3
bucket, registers it as an uploaded file, and compiles a document that `\usepackage`s it. Had
the asset not been fetched from object storage and written to disk, pdfLaTeX would have failed
with `File \`lumenstyle.sty' not found`.

Marked `texlive` and **deselected by default** — CI cannot pull an 8.4 GB image per run.
`pytest -m texlive` opts in, and `pytest.ini` now registers the marker.

### Snap Docker, a third time

The integration test first failed with a bare `exit=11`, because pytest's `tmp_path` lives
under `/tmp` and Snap Docker mounts `/tmp` binds **empty** — the container saw no files at
all. The test now uses a directory under the backend root, which works on any host. This is
the third time that one host quirk has cost debugging time; it is in M0's findings, in
`compile.sh`, in `verify.sh`, and now here.

### Tests

The old upload tests encoded the image-only rule and were rewritten rather than patched: a
`.pdf` is now a legitimate figure, so "rejects a non-image upload" had to become "rejects an
extension outside the allowlist".

**Backend 174 (+1 deselected), frontend 156 — all passing.** Among them a **cross-language
drift guard**: a frontend test reads `ALLOWED_EXTENSIONS` out of the Python source and asserts
the TypeScript copy matches exactly, because two hand-maintained lists drift.

## M7 — Fair use and operations

Compilation is unlimited on every plan, so these protect the shared fleet rather than push
upgrades. A normal user must never meet them.

- [ ] Per-user concurrent compile limit; queue beyond it
- [ ] Wall-clock timeout enforced by the supervisor, not only the engine
- [ ] Reject oversized projects at submit, not at compile
- [ ] Queue depth, wait time and compiles/second exposed as metrics. **Queue depth backing up
      is the signal to scale** — a far better signal than a user count
- [ ] Cancel a running job and reap its container
- [ ] Alert on snapshot table growth, per [ADR 0007](../decisions/0007-append-only-full-content-snapshots.md)

---

## One compile profile

[ADR 0010](../decisions/0010-one-compile-profile.md) replaced the planned two profiles with
one, because M0 measured the warm rebuild and the check profile was not faster.

**`latexmk` for users and for the agent.** The agent varies *flags*, not profiles:

| | |
|---|---|
| `-halt-on-error` | Agent wants the first error only; omit it when a user wants the whole log |
| `latexmk`'s own change detection | Is the optimisation. Its 0.44 s no-op also answers "did anything change?" |

Always: `-interaction=nonstopmode`, `-file-line-error`, `-synctex=1`.

**Warm state is load-bearing, not an optimisation.** The per-project `.aux`/`.fls`/`.fdb_latexmk`
cache is what makes an agent iteration 7 s instead of 36 s. Treat losing it as a performance
incident.

## Hardening checklist

Every compile, without exception:

```
--rm                          throwaway; never reused across users
--network=none                no exfiltration, no package fetch, no callbacks
--user <non-root>
--read-only                   writable tmpfs for output only
--tmpfs /compile/out:size=<N>m
--cpus=<N> --memory=<N>m --memory-swap=<same>   no swap
--pids-limit=<N>
--cap-drop=ALL --security-opt=no-new-privileges
--security-opt seccomp=<profile>
```

Plus a supervisor-side wall-clock kill, and `texmf.cnf` with
**`shell_escape=p`** ([ADR 0009](../decisions/0009-use-restricted-shell-escape.md)),
`openin_any=p`, `openout_any=p`.

Also required, from M0:

| | Why |
|---|---|
| **No secrets in the container's environment** | A document reads `/proc/self/environ` and the values land in the log we return |
| **`docker kill` by container name** | Killing the client does not stop the container |
| **Size cap on the writable output mount** | An uncapped mount took a 186 MB log |
| **512 MB `/tmp`** | biber is par-packed Perl and fails to unpack in 64 MB |
| **Writable, pre-seeded font cache** (41 MB) | Not a tmpfs — luaotfload rebuilds, costing 10× — and not read-only, which makes LuaLaTeX fail fatally |

**Never pass `-shell-escape`**, which would turn restricted mode into unrestricted.

**`openin_any=p` does not stop `\input`.** It governs `\openin` only, so arbitrary file read
remains possible and **the container is the sole barrier against disclosure.**

---

## Testing

Feature folders per [ADR 0004](../decisions/0004-feature-folders-for-tests.md):

```
backend/tests/unit/compiles/     service logic, log parser, flag construction
backend/tests/api/compiles/      endpoints, ownership scoping, cancellation
frontend/tests/unit/compile/     polling, status mapping, error list
frontend/tests/e2e/compile/      submit → PDF appears; broken doc → clickable error
```

- The log parser is pure functions over fixture logs — **test it hardest**, it needs no
  Docker and carries the most Phase 2 risk
- Tests needing a real compile get a `@pytest.mark.texlive` marker, **deselected by
  default**. CI cannot reasonably pull 2.5 GB per run; those run on a schedule or a tagged
  job
- E2E specs capture screenshots via the `proof` fixture per
  [ADR 0005](../decisions/0005-screenshots-as-e2e-proof.md)
- Compiler tests must not use the SQLite fallback — schemas drift from Postgres

---

## Risks

| Risk | Mitigation |
|---|---|
| **Compile infrastructure is harder than expected** | It blocks everything, so it is first. M0 and M1 exist to find this out in days rather than months |
| **Per-compile latency too high for the agent** | M0 measures it. Levers in order: warm per-user pools, persisted `.aux`, `-draftmode`, precompiled preambles |
| **Throwaway containers vs warm caches** | Caches live outside the container, keyed per project, remounted per job |
| **A document needs a package we do not ship** | Full scheme specifically to avoid this. Log every missing-package failure from day one — that log is the signal |
| **Log parser sends the agent to the wrong line** | Worse than no help. Corpus and a 6/7 prototype exist (M5); the residual risk is the errors carrying no location at all |
| **An incumbent ships this first** | Overleaf already has the compile infrastructure and needs only to add the agent — the easier half. Speed matters, and Phase 3 is where we win |

---

## Out of scope

Deliberately, so they stop being re-proposed in review:

- **Auto-compile on idle** — needs measured latency and a debounce policy first
- **Source ↔ output sync** — `-synctex=1` produces the data in M1 so it is not lost;
  consuming it in the viewer is later
- **Engine support beyond pdfLaTeX** — wired in M3, supported when tested against real
  templates. Blocks Urdu, Arabic, Persian and CJK users until then
- **gVisor** — pending the M0 measurement; required before public multi-tenant launch
- **Per-project TeX Live year pinning** — Overleaf offers this; cheap to design in now,
  expensive later. **Open question, decide before M3**
- **Warm worker pools** — only if M0 says container startup demands it
- **Agent anything** — Phase 2
