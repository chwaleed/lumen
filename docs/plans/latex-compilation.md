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

## M0 — Measure first

**Do not skip this.** ADR 0008 rests partly on unmeasured numbers, and the isolation choice
in particular cannot be made from published figures — they are hello-world benchmarks or
untraceable SEO content. One day of work here de-risks the whole phase.

- [ ] Pull the pinned image; record real pull time and on-disk size
- [ ] Assemble a corpus: 3–5 real theses (60+ files, bibliography, TikZ), plus one small
      article and one deliberately broken document
- [ ] Time cold and warm builds, all three engines, full build vs `-draftmode` single pass
- [ ] Time `docker run` create → run → teardown against the 4.5 GB image — this sets the
      floor on agent iteration latency
- [ ] Repeat the corpus under `runsc` (gVisor) vs `runc`. gVisor's known weak spot — ~11×
      slower small-file reads — lands exactly on TeX's package loading, so measure it rather
      than assuming
- [ ] Find the concurrency knee: compiles in flight at 1, 2, 4× core count, watching p95
- [ ] Confirm the engines are present, and **read `shell_escape_commands` out of the shipped
      `texmf.cnf`** rather than trusting any published list

**Record the results in this file.** They feed the fair-use values that
[requirements.md §8](../product/requirements.md) still lists as open, and the capacity
numbers in [ai-agent-vision.md §8](../product/ai-agent-vision.md).

---

## M1 — Compile by hand, no application

Prove the image, flags and hardening in isolation before any code depends on them.

- [ ] Pin a dated tag (`texlive/texlive:TL2026-...`). **Never `latest`** — it is rebuilt
      weekly, which defeats the reproducibility TeX Live was chosen for
- [ ] Build a thin `lumen-tex` image on it, carrying only an overridden `texmf.cnf`
- [ ] Set `shell_escape=f`, `openin_any=p`, `openout_any=p`. `openin_any` ships as `a`,
      meaning read any file, so this is a real change and not a formality
- [ ] Write the `docker run` invocation from the hardening checklist below
- [ ] Verify the attacks fail: `\input{/etc/passwd}` yields nothing, `\write18{...}` is
      refused, an infinite macro loop is killed by the wall-clock cap, a memory bomb hits the
      cgroup limit rather than the host
- [ ] Verify a real thesis from the M0 corpus builds, with bibliography resolved

**Done when** the exact command line that the service will shell out to is written down and
every item above is checked.

---

## M2 — Compile service and worker, driven from a CLI

No HTTP yet. The point is a working pipeline that can be exercised without the API.

- [ ] Add Redis to `docker-compose.yml`
- [ ] Add **RQ** for the queue. Mature, synchronous, and matches a codebase whose handlers
      are all sync `def`. Celery is heavier than this needs; `arq` assumes async
- [ ] New backend package `src/compiles/` following the house layout — `models.py`,
      `schemas.py`, `router.py`, `service.py`, with the router thin and the work in the
      service
- [ ] `service.py`: materialise a project's files from `file_entries` + latest
      `file_snapshots` into a scratch directory
- [ ] Supervisor process: pop a job, materialise files, `docker run --rm`, collect
      `pdf` / `log` / `synctex.gz`, upload to S3, update the job row
- [ ] Per-project cache directory for `.aux`/`.fls`, mounted per job. **Keyed per project —
      a shared cache would be a cross-tenant channel**
- [ ] A management command to submit a job and print the result

> **Known caveat.** The supervisor needs Docker access, which is effectively root on the
> host. This is what Overleaf's CLSI does, and the supervisor is trusted code that never
> executes user content — but prefer **rootless Docker or Podman** if it works on the target
> host. Note that Overleaf documents sandboxed compiles as *not working* under Snap-installed
> Docker, and the current dev machine has Snap Docker.

**Done when** `python -m src.compiles.cli <project_id>` returns a PDF for a real project.

---

## M3 — API

- [ ] Migration: `projects.engine`, `String(16)`, not null, default `pdflatex`. Add it now
      even though only one value is legal — ADR 0008 depends on this being a value rather
      than a hardcode, and pdfTeX is frozen upstream so the default will likely move
- [ ] Migration: `compile_jobs`

| Column | Type | Note |
|---|---|---|
| `id` | int PK | |
| `project_id` | FK → projects, cascade | |
| `root_file_id` | FK → file_entries | usually `main.tex` |
| `engine` | str | snapshot of the project value at submit time |
| `profile` | str | `full` or `check` |
| `status` | str | `queued`, `running`, `success`, `failure`, `timeout`, `cancelled` |
| `exit_code` | int, null | |
| `duration_ms` | int, null | |
| `error_count` | int, null | |
| `pdf_key`, `log_key`, `synctex_key` | str, null | S3 keys |
| `created_at`, `started_at`, `finished_at` | timestamptz | |

- [ ] Index `(project_id, created_at desc)` — the only read pattern that matters
- [ ] Endpoints, all ownership-scoped, returning **404 not 403** for another user's project
      per [ADR 0003](../decisions/0003-return-404-for-another-users-resource.md):

```
POST   /projects/{id}/compile              → 202 { job_id }
GET    /projects/{id}/compile/{job_id}     → status, timings, error count
GET    /projects/{id}/compile/{job_id}/pdf → presigned URL
GET    /projects/{id}/compile/{job_id}/log → parsed errors + raw log
DELETE /projects/{id}/compile/{job_id}     → cancel
```

- [ ] Responses go through `ApiResponseBuilder`, so every one is `{success, message, data}`
- [ ] New settings in `Settings` — **no bare `os.getenv`**:
      `TEXLIVE_IMAGE`, `REDIS_URL`, `COMPILE_TIMEOUT_SECONDS`, `COMPILE_MEMORY_MB`,
      `COMPILE_CPUS`, `COMPILE_TMPFS_MB`, `COMPILE_MAX_CONCURRENT_PER_USER`,
      `COMPILE_MAX_PROJECT_BYTES`. Placeholders into `.env.example`
- [ ] **Raise the SQLAlchemy pool.** The default `pool_size=5` + `max_overflow=10` = 15
      connections against 40 anyio threads plus workers is the real ceiling, and it bites
      around 15 concurrent queries — well before 100 users

**Done when** a compile can be submitted, polled and fetched over HTTP.

---

## M4 — PDF in the editor

- [ ] Replace the raw-source placeholder in the preview panel with a real PDF viewer
      (`pdf.js` / `react-pdf`), with page navigation and zoom
- [ ] Wire both existing dead PDF buttons
- [ ] **Remove the "Auto-compile On" badge.** It is a label for a feature that does not
      exist, and shipping it trains users not to believe the interface. Reinstate it only
      when auto-compile is real
- [ ] Poll job status with backoff; show queued / running / failed distinctly
- [ ] Colours from semantic tokens in `app/globals.css` only — no raw palette values
- [ ] Client calls use relative paths; the browser never reaches port 9000 directly

**Done when** pressing Compile shows a PDF, and a failure shows the log instead.

---

## M5 — Parsed errors and navigation

**This is a subproject, not a line item.** The agent's accuracy in Phase 2 will be bounded
by it, and declining CLSI (ADR 0008) means declining the best existing parser.

- [ ] Parse to `(file, line, severity, message)`. `-file-line-error` exists to make this
      tractable — it is already in the flag set
- [ ] Deduplicate. LaTeX produces one real error as fifty messages, and the **real error
      must come first**
- [ ] Surface warnings separately: overfull boxes, undefined references, missing citations
- [ ] Click an error → open the file, scroll to the line
- [ ] Study before writing: `texoutparse` (Python, closest to our stack), `texlogsieve`
      (good deduplication), Overleaf's JS parser (most battle-tested — **check its licence**)
- [ ] Build the hard-case corpus now: wrong line numbers, cascading failures, errors inside
      `\input`-ed files, missing `.sty`, unresolved citations

**Done when** the broken documents from M0 each produce one correct, clickable first error.

---

## M6 — Non-image uploads

Roadmap 1.8. Today only images can be uploaded, so **real projects cannot build at all.**

- [ ] Allow `.bib`, `.cls`, `.sty`, `.bst`, and common image formats
- [ ] Keep the existing safety: extension and type allowlist, directory components stripped
- [ ] Project size ceiling enforced server-side
- [ ] These files are untrusted input executed by the compiler — the M1 hardening is what
      makes this safe, so do not ship M6 before M1 is verified

---

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

## The two compile profiles

Build both now even though only `full` is reachable in Phase 1. The `check` profile is what
makes the Phase 2 agent affordable, and retrofitting it means reworking the worker.

| | `check` — agent inner loop | `full` — users, agent final pass |
|---|---|---|
| Driver | engine directly | `latexmk` |
| Passes | one | as many as needed |
| `-draftmode` | **yes** | no |
| Bibliography | skipped | `biber`/`bibtex` |
| `-halt-on-error` | yes | no — users want the whole log |
| SyncTeX | no | yes |
| Output | log only | PDF + log + synctex |
| Goal | lowest latency to an error | correctness |

---

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

Plus a supervisor-side wall-clock kill, and `texmf.cnf` with `shell_escape=f`,
`openin_any=p`, `openout_any=p`.

**Disabling shell escape is safe here** because `latexmk` invokes `bibtex`/`biber` and
`makeindex` directly as processes — it does not need `\write18`.

**It breaks `minted` and `gnuplottex`.** `minted` is common in CS theses, so decide the
answer before launch: document `listings` as the alternative, or support `minted`'s cache
workflow. This will be asked on day one.

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
| **Log parser sends the agent to the wrong line** | Worse than no help. Build the hard-case corpus in M5, before the agent exists |
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
