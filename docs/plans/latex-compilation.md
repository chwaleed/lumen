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

## M0 — Measure first — **DONE (2026-10-06/07)**

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

## M1 — Compile by hand, no application — **DONE (2026-10-07)**

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

**Prototyped during M0, and it is less risky than feared.** The findings below replace the
earlier "this is a subproject, not a line item" framing — it is still real work, but the
shape is now known.

### What M0 established

**`-file-line-error` resolves subfile attribution correctly.** The hard case I expected to
fight — an error buried inside an `\input`-ed file, where the line number could refer to the
wrong file — just works: pdfTeX reports `./sections/bad.tex:1: Missing $ inserted.` **This
retires the largest M5 risk.**

**Do not reuse `texoutparse`.** Measured against seven broken documents, it found errors in
only 2 of 7 and **never returned a file or line**. It recognises the default `! message`
format and misses the `file:line: message` format that `-file-line-error` produces — the one
format we need. Its warning extraction is good (3/3 on undefined refs and citations).

**A ~90-line parser got 6/7 root-cause-first**, with correct file and line:

| Broken document | Root cause located |
|---|---|
| `undefined_command` | ✅ `./undefined_command.tex:4` |
| `missing_dollar` (cascades to 2 errors) | ✅ `:4` — correct one ranked first |
| `bad_environment` | ✅ `:6` |
| `nested_error` (error inside `\input`) | ✅ `./sections/bad.tex:1` |
| `missing_package` | ✅ `:2` — recovered by searching sources for the `\usepackage` |
| `undefined_reference` | ✅ warnings, line 4, separated from errors |
| `unbalanced_brace` | ❌ **no location exists in the log** |

The prototype and corpus are in `~/lumen-m0/` (`parse_proto.py`, `corpus/broken/`).

### The residual difficulty

Not parsing. These three:

1. **Errors with no location at all.** `! File ended while scanning use of \textbf.` carries
   no file and no line. This is the genuinely hard class and it needs source-side inference —
   for `missing_package` the prototype recovered the line by searching the sources for the
   matching `\usepackage`, and the same trick will not generalise to brace mismatches.
2. **Misleading locations.** `missing_package` logs `Emergency stop` at line 3 while the real
   `\usepackage` is on line 2. **Follow-on lines must be suppressed, not ranked** — otherwise
   the agent is sent to the wrong line, which is worse than no help.
3. **Cascades.** One missing `$` produced errors on lines 4 and 5. Dedup and correct ranking
   are what make the output usable.

### Work

- [ ] Parse to `(file, line, severity, message)` from `-file-line-error` output
- [ ] Suppress follow-ons (`Emergency stop`, `==> Fatal error`) rather than reporting them
- [ ] Deduplicate cascades; **rank the real error first**
- [ ] Source-side inference for unlocated errors, starting with missing files/packages
- [ ] Warnings surfaced separately: undefined references, undefined citations, overfull boxes
- [ ] Click an error → open the file, scroll to the line
- [ ] Grow the broken corpus — it is already the regression suite, and it is cheap to extend
- [ ] Reconsider Overleaf's JS parser only if our own stalls; **check its licence first**

**Done when** every document in the broken corpus yields one correct, clickable first error,
and the two unlocatable classes degrade honestly rather than pointing somewhere wrong.

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
