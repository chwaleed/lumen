# Research: which LaTeX compiler should Lumen use?

**Status:** Research complete, **decision not yet made.** Written to be reviewed before an
ADR is raised. Nothing in the codebase has been changed.

**Why this matters:** [roadmap.md](../product/roadmap.md) puts compilation in Phase 1 and
makes every other phase depend on it. This document picks the thing Phase 1 is built out of.

---

## 0. The question is really five questions

"Which compiler should we use" sounds like one choice between named products. It is not.
A compile request passes through five independent layers, and each has its own answer:

| # | Layer | The actual question |
|---|---|---|
| 1 | **Engine** | pdfTeX, XeTeX, LuaTeX — which binary turns `.tex` into `.pdf`? |
| 2 | **Orchestrator** | Who decides how many passes, and when to run the bibliography tool? |
| 3 | **Distribution** | Where do the ~4,000 CTAN packages come from, and which version? |
| 4 | **Build vs. buy** | Write a compile service, or adopt Overleaf's? |
| 5 | **Isolation** | What stops a hostile `.tex` file from owning the host? |

Picking an "engine" and calling it done is how this goes wrong. Layer 5 is the one that
actually decides whether Lumen can be a public product, and layer 1 — the one that sounds
like the whole question — is the least consequential.

---

## 1. Recommendation, up front

| Layer | Recommendation | Confidence |
|---|---|---|
| **Engine** | **pdfTeX by default**, XeTeX and LuaTeX selectable per project | High |
| **Orchestrator** | **`latexmk`**. Never hand-roll the pass logic | Very high |
| **Distribution** | **TeX Live, full scheme, pinned to a year.** Not MiKTeX | High |
| **Build vs. buy** | **Build our own service. Read Overleaf's CLSI, do not depend on it** | High — the licence decides it |
| **Isolation** | **One container per compile**, no network, non-root, read-only TeX tree, hard CPU/memory/wall-clock caps, `shell_escape=f`, `openin_any=p`, `openout_any=p`. Add **gVisor** before public multi-tenant launch | High |

**In one sentence:** `latexmk -pdf` driving pdfTeX, from a pinned full TeX Live inside a
locked-down throwaway container, with engine choice exposed as a per-project setting.

This is approximately what Overleaf does, and the reasons it is boring are the reasons it
is right. The interesting engineering in Phase 1 is not the engine — it is §7 (the agent's
compile profile) and §6 (isolation).

---

## 2. Layer 1 — the engine

### The three real candidates

All three ship with TeX Live, all three read the same `.tex` files, and all three are
selectable per document. They differ in font handling, Unicode support, speed and package
compatibility.

| | **pdfTeX** | **XeTeX** | **LuaTeX** |
|---|---|---|---|
| Invoked as | `pdflatex` | `xelatex` | `lualatex` |
| Unicode input | Via `inputenc`; clumsy | Native UTF-8 | Native UTF-8 |
| System fonts (OTF/TTF) | **No** | Yes, via `fontspec` | Yes, via `fontspec` |
| RTL / complex scripts | Poor | Good (ICU) | Good (HarfBuzz) |
| Microtypography | **Best** (full `microtype`) | Partial | Good |
| Package compatibility | **Widest** — the default target for 30 years | Good; some packages break | Good; some packages break |
| Speed | **Fastest** | Slowest startup | Slow startup, fast scripting |
| Scripting | None | None | Embedded Lua |
| PDF output | Direct | Via intermediate XDV → `dvipdfmx` | Direct |

### On the speed numbers

The most-cited public benchmark is Takayuki Yato's, on TeX Live 2025: a **plain TeX
"hello world"** took pdfTeX 269.9 ms, LuaHBTeX 593.6 ms and XeTeX 744.8 ms.

**Read that carefully before using it.** A hello-world run measures process startup and
format loading — essentially fixed overhead — and says almost nothing about throughput on
a 300-page thesis. The ratio on a real document is different and document-dependent. The
widely repeated claim that "pdfLaTeX is 2× faster than XeLaTeX" traces back to SEO content
sites, not to a reproducible benchmark (see §10).

What the number *is* good for: it bounds the **floor** of per-compile latency. Even an
empty document costs a few hundred milliseconds of engine startup, and an agent that
compiles 20 times per task pays that 20 times. That floor matters more than throughput for
the agent loop, and it favours pdfTeX.

### Verdict

**Default to pdfTeX. Expose all three.**

- pdfTeX is the fastest, the most compatible, and the right default for the thesis and
  paper documents that [requirements.md §2](../product/requirements.md) names as the
  primary users.
- XeTeX and LuaTeX are **not optional extras.** Any user writing in Arabic, Hebrew, Persian,
  Urdu, Chinese, Japanese or Korean, or using a university-mandated OpenType font, needs
  one of them. Shipping pdfTeX only would exclude them outright.
- Overleaf exposes exactly this choice — CLSI's compile options accept
  `latex | pdflatex | xelatex | lualatex` — which is good evidence that per-project engine
  selection is the expected shape, not a luxury.

Store the engine on the project, default `pdflatex`, and pass it through to `latexmk`
(`-pdf`, `-pdfxe`, `-pdflua`). This is already listed as "Engine selection" in
[feature-inventory.md](../product/feature-inventory.md) — it should land in Phase 1, not later,
because switching engines after documents exist is a migration.

### Tectonic — the interesting one we should still decline

[Tectonic](https://tectonic-typesetting.github.io/) deserves a serious look because it
solves the problem that makes TeX Live painful: size and setup.

**What it gets right:**

- A **single self-contained binary**, MIT licensed, written in Rust.
- **Packages fetched on demand** from a web bundle and cached locally. No 4 GB image.
- Deterministic builds against a pinned bundle.
- It runs the multi-pass loop itself — no `latexmk` needed.
- Actively released: 0.17.0 in July 2026, after 0.16.9 in April 2026.

**Why it is still the wrong primary choice for Lumen:**

| Problem | Consequence |
|---|---|
| **XeTeX-derived engine only** | No pdfTeX, no LuaTeX. We would lose the fastest engine and the Lua one, and inherit XeTeX's package quirks for *everyone* |
| **Fetches packages over the network at compile time** | Directly contradicts the no-network sandbox in §6. Workable only by pre-warming the cache into the image — at which point the size advantage is mostly gone |
| **`biber` integration is rough** | Documented failures with `\addbibresource` using relative parent paths, and biblatex/biber version skew against the bundled TeX Live. **Bibliographies are not a nice-to-have for a thesis tool** |
| **Maintainer bandwidth** | The maintainers have stated publicly they lack time and motivation for serious work on it. Releases continue, but this is a bus-factor risk on our critical path |
| **Smaller blast radius of testing** | TeX Live + `latexmk` is what every university template and every journal class file is tested against |

**Verdict: no, but revisit.** If TeX Live image size or cold-start becomes the binding
constraint, Tectonic is the first thing to re-evaluate — specifically as a *fast path* for
simple single-file documents, with TeX Live as the fallback. That is a Phase 3+ optimisation,
not a Phase 1 foundation. Do not build the product on it.

---

## 3. Layer 2 — the orchestrator

**Use `latexmk`. This one is not close.**

LaTeX is a multi-pass system and the number of passes is not knowable in advance. Cross
references, `\label`/`\ref`, bibliographies, indexes, `tocdepth`, `longtable` and
`tikz` externalisation all converge at different rates. A naive "run it three times" is
simultaneously wrong and wasteful: wrong because some documents need four, wasteful because
most need two.

`latexmk` (currently 4.86a, Dec 2024, in TeX Live):

- Inspects the `.aux`, `.log` and fls files and **reruns only until the document is stable.**
- **Auto-detects `bibtex` vs `biber`** and runs the right one. This is worth more than it
  sounds — getting it wrong produces a document with silently unresolved `[?]` citations.
- Runs `makeindex` and `makeglossaries` when needed.
- Handles the `-pdf` / `-pdfxe` / `-pdflua` engine switch for us.

Overleaf uses `latexmk` for exactly this reason. Alternatives considered and rejected:

| Tool | Why not |
|---|---|
| **Hand-rolled pass loop** | We would reimplement rerun detection, badly, and own that bug forever. The single largest avoidable mistake available in Phase 1 |
| **`arara`** | Requires directives inside the user's source. We cannot ask users to annotate their documents, and the agent should not have to |
| **`rubber`** | Less maintained, smaller community, no biber parity |
| **Tectonic's internal loop** | Tied to taking Tectonic as the engine (§2) |

### Flags that matter

These are not cosmetic — three of them directly determine whether §7's log parser is
feasible:

| Flag | Why |
|---|---|
| `-interaction=nonstopmode` | Never prompt. A compile that waits for stdin is a hung job holding a core |
| `-file-line-error` | Emits `file:line: message`. **Without this, reliable error extraction is substantially harder.** The Python `latex` package's parser outright requires it |
| `-synctex=1` | Produces `.synctex.gz`, which is what source ↔ output sync in the PDF viewer needs. Cheap to enable now, awkward to retrofit |
| `-no-shell-escape` | See §6 |
| `-output-directory` | Keeps generated files off the source tree. Interacts with `openout_any=p` — test this combination explicitly |
| `-halt-on-error` | **Situational.** Good for the agent's fast feedback, bad for users (they want to see the whole log). Set per profile, see §7 |

---

## 4. Layer 3 — the distribution

### TeX Live vs MiKTeX

**TeX Live.** MiKTeX's defining feature — installing packages on the fly when a document
asks for them — is an anti-feature on a server:

- It needs **network access at compile time**, which §6 forbids.
- It destroys **reproducibility.** A document that built yesterday can build differently
  today against a newer package. For a product whose users submit to journals, "it compiled
  differently this week" is a support nightmare.
- It makes compile latency **unpredictable** — the first document to use a package pays a
  download.

TeX Live ships one frozen set per year, identical on every platform. "Built with TeX Live
2026" names a reconstructible environment. That is the property we want.

### Which scheme

Sizes, from TeX Live's own figures (January 2026) and the Island of TeX images:

| Scheme | Installed size | Contains |
|---|---|---|
| `scheme-basic` | ~116 MB (no docs/src) | Plain TeX + LaTeX, little else |
| `scheme-small` | ~400 MB image | Adds XeTeX, MetaPost, recommended packages |
| `scheme-medium` | ~800 MB image | |
| `scheme-full` | **~4,312 MB** (no docs/src) | Everything shippable from CTAN |
| `scheme-full` + docs + src | ~7.9 GB (~8.7 GB on disk) | Docs alone are 3.7 GB; fonts 2.9 GB |

**Recommendation: full scheme, without documentation or sources.** ~4.3 GB.

The temptation is to ship something small and grow it. Resist it, because of what the
product promises. [requirements.md](../product/requirements.md) targets thesis writers using
university and journal classes — IEEE, ACM, Springer, Elsevier, and several hundred
institution-specific `.cls` files, each pulling its own dependency set. A missing package is
not a degraded compile; it is a **hard failure on someone's thesis**, and it is a failure we
cannot predict or enumerate in advance.

Dropping docs and sources removes ~3.7 GB for free, since nothing server-side reads them.

> **Note the asymmetry.** Image size is a one-time cost per worker node, paid at deploy. A
> missing package is a user-facing failure, paid forever, in support load and trust. Trading
> 4 GB of disk for "no document fails because we economised" is obviously correct.

### Where the image comes from

The official `texlive/texlive` image on Docker Hub, maintained by **Island of TeX**:

- `latest` is the full scheme, rebuilt **weekly**, currently ~2.5 GB compressed.
- Variants: base (no docs/src), `-doc`, `-src`, `-doc-src`.
- **Pinnable** via `TL{YEAR}-{MONTH}-{DAY}-{HOUR}-{MINUTE}` tags, plus `TL{YEAR}-historic`
  for past years. Historic images are rebuilt monthly for OS security patches.
- Dockerfiles are MIT; the bundled software keeps its own terms.

**Pin an explicit tag. Never deploy `latest`.** A weekly-rebuilt `latest` means TeX Live can
change under us without a deploy, which is precisely the reproducibility property we chose
TeX Live to get. Treat a TeX Live upgrade as a deliberate, tested migration — Overleaf
treats it the same way, as a versioned per-project setting.

**Open question worth deciding early:** whether projects pin a TeX Live *year* the way
Overleaf does. Supporting multiple years means storing several 4 GB images, but it is the
only way an old thesis still builds in three years. Cheap to design in now, expensive later.

---

## 5. Layer 4 — build or adopt Overleaf's CLSI?

Overleaf's compile service, **CLSI** (Common LaTeX Service Interface), is open source and
does exactly what Phase 1 needs. It is worth being precise about why we should not use it.

### What CLSI is

- A REST service: `POST /project/{id}/compile`, with `resources` supplied inline or as URLs.
- Options include `compiler` (`latex|pdflatex|xelatex|lualatex`) and `timeout`
  (**default 60 s**).
- Returns output files as URLs — `pdf`, `log`, and others.
- Two execution modes: **local** (run the tools directly) and **Docker runner**
  (`DOCKER_RUNNER=true`), which mounts the host Docker socket and starts **sibling
  containers** per compile from a TeX Live image with the project bind-mounted at `/compile`.
- Listens on 3013 (API), 3048 (load reporting), 3049 (control).
- Caches by project state hash, so unchanged files are not rewritten.

This is a well-shaped design and **we should copy its shape.** The load-reporting port and
the state hash are both things we would otherwise discover we needed in month three.

### Why not depend on it

| Reason | Detail |
|---|---|
| **Licence — the decisive one** | CLSI is **AGPL-3.0**. For a commercial SaaS this is a serious constraint, and §13 of the AGPL exists precisely to cover network services. At minimum, modifications to CLSI must be published. Whether the obligation reaches the rest of Lumen across an HTTP boundary is a genuinely unsettled question that depends on whether the two are one work. **This needs a lawyer, not an engineer's opinion** — and a licence question on the critical path of the core feature is itself a reason to avoid it |
| **Sandboxing is not in the free edition** | Sandboxed compiles are a **Server Pro** feature, explicitly "not available in Community Edition, which is intended for use in environments where all users are trusted." We are the opposite of that. The part we most need is the part not offered |
| **Shape mismatch** | CLSI expects to be handed the whole file set per compile. Lumen already stores files, and the agent will mutate a few files between rapid compiles. We want to send a diff against a warm workspace, not re-upload a thesis 20 times per task |
| **Node.js** | Adds a third runtime to a Python + TypeScript stack, with its own deploy and dependency surface |
| **Docker-socket design** | Mounting the host Docker socket is effectively root on the host. Acceptable inside Overleaf's trust model; a poor default for ours |

> **Practical note for local dev:** Overleaf documents that sandboxed compiles **do not work
> when Docker is installed via Snap**. The Docker on this machine is Snap
> (`/snap/bin/docker`). If anyone evaluates CLSI hands-on, that will bite immediately, and
> it is worth knowing before an afternoon is lost to it.

### Verdict

**Build our own, deliberately modelled on CLSI's architecture.** Read the repository as a
reference implementation — it encodes a decade of operating this at scale — and reimplement
the parts we need in Python against our own file storage. Specifically worth borrowing:

1. Compile as a **job with an explicit timeout**, never an inline request handler.
2. A **load-reporting endpoint** so the queue can make scheduling decisions.
3. **Project-state hashing** to skip redundant file writes.
4. Output as **addressable artifacts** (`pdf`, `log`, `synctex`), fetched separately.

Also borrow their **log parser**, which is open source JavaScript in the Overleaf monorepo
and is the most battle-tested LaTeX log parser in existence — but check its licence before
porting, and treat §7 as a real subproject either way.

---

## 6. Layer 5 — isolation. The part that actually matters

**LaTeX is a Turing-complete language with file and shell access, and we are proposing to
run it on arbitrary user input.** This is a code-execution service wearing a document
editor's clothes.

### The threat is documented and real

"Can You Accept LaTeX Files from Strangers? Ten Years Later" (arXiv
[2102.00856](https://arxiv.org/abs/2102.00856)) is the reference. The authors built a
malicious LaTeX package that harvested system data and **hid it inside the output PDF**,
then tested real online compilation services with it. Two findings transfer directly:

1. **Sandboxing works; command restriction is hard to get right.** Services relying on
   blocklists were weaker than services relying on isolation.
2. At least one evaluated service (PMLatex) was simply too permissive.

Users bring third-party `.sty` and `.cls` files constantly — that is normal LaTeX practice,
and [roadmap.md](../product/roadmap.md) item 1.8 makes uploading them a Phase 1 feature. So the
attack path is not hypothetical; it is a planned feature.

### Attacks that work even with shell escape disabled

This is the part people miss. Turning off `\write18` is necessary and **not sufficient**:

| Attack | Mechanism |
|---|---|
| **Arbitrary file read** | `\input{/etc/passwd}` — contents get typeset into the PDF. No shell needed |
| **Arbitrary file write** | `\openout` outside the project, if `openout_any` is not locked down |
| **Denial of service** | Infinite macro expansion, or `\def` bombs that exhaust memory. A compile that never terminates holds a core |
| **Memory-unsafety exploits** | The engines are large, old C codebases parsing hostile input. A parser bug becomes a container escape |

That last row is why a container alone is not a sufficient answer: **a container shares the
host kernel**, so a TeX parser bug plus a kernel bug is a host compromise.

### Hardening at the TeX layer

Set in `texmf.cnf`. Note that **the defaults are not safe enough**:

| Setting | Default | Set to | Effect |
|---|---|---|---|
| `shell_escape` | `p` (restricted) | **`f`** | No shell commands at all |
| `openin_any` | **`a` (any!)** | **`p`** | Blocks `\input{/etc/passwd}` |
| `openout_any` | `p` | **`p`** (confirm) | No writes outside `$TEXMFOUTPUT` or parent dirs |

`openin_any` defaulting to `a` — read any file — is the one to be sure about. That default
is the arbitrary-file-read primitive, enabled out of the box.

TeX Live's restricted shell-escape allowlist is short (`bibtex`, `bibtex8`, `extractbb`,
`gregorio`, `kpsewhich`, `makeindex`, `repstopdf`, `texosquery-jre8`). Older and
other-distribution lists are much longer, so **read the allowlist out of the image we
actually ship rather than trusting any published list, including this one.**

**We can disable shell escape outright, and should.** `latexmk` invokes `bibtex`/`biber` and
`makeindex` directly as separate processes — it does not need `\write18` to do it. So the
usual argument for restricted mode does not apply to our setup.

> **Known cost, state it in the docs:** `minted` (code highlighting via `pygmentize`) and
> `gnuplottex` require shell escape and **will not work.** `minted` is common in CS theses.
> Options: ship `minted`'s cache workflow, offer `listings` as the documented alternative,
> or run a separate much-more-restricted profile for it. Decide this before launch, because
> "my code blocks don't render" will arrive on day one.

### Runtime isolation — the options

| Approach | Isolation | Cost | Verdict |
|---|---|---|---|
| **Bare process + rlimits** | Weak | None | **No.** One file-read bug leaks every user's data |
| **Container (runc), hardened** | Shared kernel | Negligible | **Phase 1.** Necessary minimum |
| **nsjail / bubblewrap** | Namespaces + seccomp-bpf + cgroups | Very low | Good complement, finer-grained than plain Docker |
| **gVisor (runsc)** | User-space kernel, syscalls intercepted | See below | **Before public multi-tenant launch** |
| **Firecracker microVM** | Dedicated guest kernel | ~125 ms boot, <5 MiB/VM | Strongest. Reach for it if gVisor's I/O cost proves too high |

**On gVisor's real cost** — the numbers look alarming and mostly are not, for this workload:

- A simple syscall costs ~830 ns (KVM mode) vs ~62 ns native: **≥2.2× slower.**
- I/O is where it hurts: open/close on external tmpfs **216× slower**, small file reads
  **11× slower**, large downloads 2.8× slower.
- But in production at Ant Group, **70% of applications saw <1% overhead** and a further
  25% saw <3%.

LaTeX compilation is CPU-bound with a burst of small file reads at startup (loading the
format and packages). The CPU part is nearly free under gVisor; the file-read part is
exactly the 11× case. **This needs measuring on a real document before committing** — it is
the single most important unknown in this document (§9).

### The Phase 1 configuration

Per compile, one throwaway container:

- `--network=none` — no exfiltration, no package downloads, no callbacks.
- Non-root user, read-only root filesystem, read-only TeX tree.
- Project mounted at a fixed path; **writable `tmpfs` output directory with a size cap.**
- `--cpus`, `--memory` (hard, with no swap), `--pids-limit`.
- **Wall-clock kill** enforced by the supervisor, not only by the engine.
- `--cap-drop=ALL`, `--security-opt=no-new-privileges`, seccomp profile.
- Destroyed after every compile. No reuse across users, ever.

Note the tension with §7: throwaway containers are safe, but they discard the `.aux` and
`.fmt` caches that make the agent loop fast. Caches must be persisted *outside* the
container and remounted — and **cache state must be keyed per project**, never shared, or it
becomes a cross-tenant channel.

---

## 7. The agent changes the problem

This is the part that does not come from reading about LaTeX, and the part most likely to be
missed if this research is outsourced.

[ai-agent-vision.md §4](../product/ai-agent-vision.md) ranks "compile latency × cost" as the
second-hardest problem, and the reason is arithmetic:

> A human compiles every few minutes. **An agent compiles 5–20 times per request**, within
> seconds of each other, on a document that has barely changed.

At 10 s per build, a 20-iteration task spends **200 seconds** compiling. That is both too
slow to feel interactive and too expensive to be a cheap subscription feature. Optimising
the compile loop is therefore an agent-feasibility issue, not a performance nicety.

### Two compile profiles, not one

The key realisation: **the agent and the user want different things from a compile.** For
most of its iterations the agent needs to know *"does this still have errors, and where"* —
it does not need a correct, final, image-complete PDF.

| | **Fast check** (agent's inner loop) | **Full build** (user-facing, agent's final pass) |
|---|---|---|
| Driver | engine directly | `latexmk` |
| Passes | **One** | As many as needed |
| `-draftmode` | **Yes** — skips image processing and PDF writing | No |
| Bibliography | **Skipped** | `biber`/`bibtex` run |
| `-halt-on-error` | **Yes** — first error is the one to fix | No — user wants the whole log |
| SyncTeX | No | Yes |
| Output | **Log only** | PDF + log + synctex |
| Goal | Lowest possible latency to an error | Correctness |

`-draftmode` is the big lever: it replaces images with placeholder boxes and skips PDF
output, and is reported as the single largest available speedup — plausibly multiples on
image-heavy documents. The agent fixing a `Missing $ inserted` does not care about the
figures.

### Other levers, roughly in order of value

| Lever | Mechanism | Caveat |
|---|---|---|
| **Warm worker pools** | Avoid paying container creation per compile | Fights the throwaway-container rule in §6. Pool **per user**, recycle aggressively |
| **Persistent `.aux`/`.fls` cache per project** | A warm rebuild skips a pass | Must be per-project and invalidated correctly, or you ship stale cross-references |
| **Precompiled preamble (`.fmt` via `mylatexformat`)** | Skips reparsing the preamble every run | Breaks with Lua code and OpenType font loading. Invalidate whenever the preamble changes |
| **`-draftmode`** | As above | Only valid when the PDF is not wanted |
| **Compile only what changed** | Not really available in LaTeX | This is Typst's structural advantage, and we cannot have it |
| **Per-task compile budget** | Caps blast radius of a looping agent | Already required by [requirements.md §6](../product/requirements.md) |

### Log parsing is a first-class subproject

[feature-inventory.md](../product/feature-inventory.md) lists "Parsed error log" as one line.
It is not one line. LaTeX errors are famously bad: wrong line numbers, cascading failures,
and one real error producing fifty messages. The agent's effectiveness is **bounded by log
parsing quality** — a bad parser sends it to fix the wrong line, which is worse than no help.

Existing parsers to study rather than starting cold:

| Parser | Language | Note |
|---|---|---|
| **Overleaf's** | JavaScript | Most battle-tested in existence. Check the licence |
| **`texlogsieve`** | texlua | Actively maintained, good deduplication |
| **`texoutparse`** | Python | **Closest to our stack.** Small, pip-installable |
| **`pplatex`** | C++ | Good human-readable reformatting |
| **TeXworks / TeXstudio** | JS / C++ | Mature, editor-oriented |

`-file-line-error` (§3) exists mainly to make this tractable. Turn it on from the first
compile.

---

## 8. Alternatives considered and rejected

### Typst

[Typst](https://typst.app/) is a modern typesetting system with a genuinely better
architecture for our use case: **incremental compilation**, so an edit re-renders only what
changed, with clean error messages and a real scripting language. The speed difference is
reported as very large — though the specific multipliers circulating (10–100×) come mostly
from low-quality sources (§10) and should not be trusted without measurement.

**Rejected for the primary path, on market grounds, not technical ones.** IEEE, ACM,
Springer, Elsevier and the overwhelming majority of university thesis offices require LaTeX
in 2026. Our primary user is a postgraduate with a mandated template and a submission
deadline. Typst does not help them.

Worth revisiting as a **secondary** engine, and worth noting that its architecture is what
we will spend Phase 1 trying to approximate with caching. If academic publishing shifts,
this reconsideration should be quick.

### Browser-side WASM (SwiftLaTeX and similar)

[SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) compiles pdfTeX and XeTeX to
WebAssembly and runs entirely in the browser. The appeal is enormous: **zero server compute
cost**, which is directly relevant given that
[requirements.md §6](../product/requirements.md) commits to unlimited free compilation and
flags free users as a pure cost centre.

**Rejected as the primary path, for three reasons:**

1. **The agent runs server-side.** It cannot drive a compiler living in the user's tab, and
   the agent loop is the thing we charge for.
2. **No complete TeX Live in the WASM bundle** — packages are fetched from CTAN or a mirror
   at runtime, reintroducing the MiKTeX reproducibility and latency problems (§4).
3. **Incomplete ICU data**, so locale-aware line breaking misbehaves. Unacceptable for the
   multilingual users who are the reason XeTeX exists in our plan.

**But keep it on the list.** A browser-side fast preview for simple single-file documents,
with the server used for full builds and all agent work, is a legitimate cost optimisation
once the product works. It is a Phase 6-class idea, not a foundation.

### Hosted compile APIs

Rejected quickly: a third party in the critical path of our core free feature, with their
margin on our cost line, their rate limits on our fair-use policy, and their uptime as our
SLA. Compilation is the foundation of the product — we should own it.

---

## 9. What this research cannot tell us

Honest limits. Everything below needs measuring on our own hardware with our own documents,
and **no amount of further reading substitutes for it.**

| Unknown | Why it matters | How to settle it |
|---|---|---|
| **Real compile time for a real thesis** | Every capacity and cost number depends on it. Published figures are hello-world or unsourced | Take 3–5 actual theses (60+ files, bibliography, TikZ). Time cold and warm, all three engines |
| **gVisor's actual overhead on LaTeX** | Decides whether strong isolation is affordable. The 11× small-file-read penalty lands exactly on format/package loading | Same corpus under `runc` vs `runsc` |
| **Container startup overhead per compile** | Sets the floor on agent iteration latency and decides whether warm pools are mandatory | Time `create → run → teardown` against a 4 GB image |
| **How much `-draftmode` really buys** | Underpins the whole §7 fast-check profile | Same corpus, with and without |
| **Concurrent compiles per core before latency collapses** | The real capacity unit. [ai-agent-vision.md §8](../product/ai-agent-vision.md) argues for compiles/second over user counts | Load-test at 1, 2, 4× core count |
| **Image pull and cold-start time at deploy** | 4 GB per worker affects autoscaling responsiveness | Measure on the target host |

> A benchmark of these was started during this research and stopped by request, pending this
> review. **Recommendation: run it before the ADR.** Without a measured per-compile latency
> the Phase 1 design is guesswork, and §6's isolation choice in particular cannot be made on
> published numbers.

---

## 10. A note on source quality

Worth recording, because it affects how much of the above to trust and how to brief anyone
cross-checking it.

Searches on this topic return a **large volume of AI-generated SEO content** from sites
positioned as LaTeX-tool competitors — `formatex.io`, `trybibby.com`, `typetex.app`,
`letx.app`, `underleaf.ai`, `inscrive.io`, `thelatexlab.com`, `typsetter.dev` and others.
These publish confident, specific, well-formatted numbers with no methodology and no
reproducible source. Several widely-repeated claims trace back only to them, including:

- "pdfLaTeX is 2× faster than XeLaTeX" with per-document timings
- "Typst is 10–100× faster than LaTeX"
- "`-draftmode` alone gives a 5–10× speedup"
- Various TeX Live Docker image sizes

These are **plausible and directionally probably right**, which is exactly what makes them
dangerous — they are unverifiable and were not measured by anyone identifiable. A few
arXiv-hosted documents in the results appear to be SEO artifacts too, including one
"Engine-Transfer-Bench" benchmark paper and one explicitly comparing a commercial LaTeX tool
against competitors.

Claims in this document are drawn from primary sources where possible: the Overleaf and
CLSI repositories and docs, TeX Live's own documentation, Island of TeX's Docker Hub
listing, the Tectonic repository and issue tracker, the gVisor and Firecracker projects,
and the peer-reviewed security paper. Where a number comes only from a weak source it is
flagged as such above.

---

## 11. If the recommendation is accepted

What follows, in order:

1. **Run the §9 benchmark.** It is a day of work and it de-risks the largest phase.
2. **Raise ADR-0007**, "pdfTeX via latexmk on pinned TeX Live, isolated per compile",
   recording the Tectonic and CLSI rejections and their reasons.
3. Decide the three **open questions** this research surfaced:
   - Per-project TeX Live **year pinning** — yes or no (§4). Cheap now, expensive later.
   - The **`minted`/shell-escape** policy (§6). It will be asked about on day one.
   - Whether **gVisor** is Phase 1 or pre-launch (§6) — answer depends on the benchmark.
4. Feed the fair-use values (concurrency, timeout, size ceiling) back into
   [requirements.md §8](../product/requirements.md), which currently lists them as open.
5. Then build roadmap items 1.1–1.3.

Also, cross-checking this with other models is worth doing before committing — see
[compiler-research-prompt.md](compiler-research-prompt.md) for a portable version of the
question.

---

## Sources

**Primary**

- [Overleaf CLSI repository](https://github.com/overleaf/clsi) — API, options, AGPL-3.0 licence
- [Overleaf sandboxed compiles documentation](https://github.com/overleaf/toolkit/blob/master/doc/sandboxed-compiles.md) — sibling-container model, Community Edition limits, Snap incompatibility
- [Overleaf editor and compile process wiki](https://github.com/overleaf/overleaf/wiki/Editor-and-Compile-Process)
- [Overleaf plan limits](https://docs.overleaf.com/getting-started/free-and-premium-plans/plan-limits) — free tier 10 s, premium 240 s compile timeout
- [Overleaf: fixing and preventing compile timeouts](https://docs.overleaf.com/troubleshooting-and-support/fixing-and-preventing-compile-timeouts)
- [Overleaf: upgrading TeX Live](https://docs.overleaf.com/on-premises/installation/upgrading-tex-live)
- [Tectonic documentation](https://tectonic-typesetting.github.io/en-US/) and [book](https://tectonic-typesetting.github.io/book/latest/)
- [Tectonic releases](https://github.com/tectonic-typesetting/tectonic/releases) — 0.17.0, July 2026
- [Tectonic issue #49](https://github.com/tectonic-typesetting/tectonic/issues/49) — SyncTeX, closed via PR #56
- [Tectonic issue #933](https://github.com/tectonic-typesetting/tectonic/issues/933) — biber relative parent paths
- [Tectonic issue #53](https://github.com/tectonic-typesetting/tectonic/issues/53) — silent biber failures
- [texlive/texlive on Docker Hub](https://hub.docker.com/r/texlive/texlive) — Island of TeX, tags, ~2.5 GB
- [latexmk README](https://tug.ctan.org/support/latexmk/README) — version 4.86a
- [latexmk manual page](https://www.mankier.com/1/latexmk)
- [TeX Live size and space figures](https://latex.silmaril.ie/formattinginformation/size.html)
- [SwiftLaTeX repository](https://github.com/SwiftLaTeX/SwiftLaTeX) — WASM engines, ICU limitation
- [Firecracker announcement, AWS](https://aws.amazon.com/blogs/opensource/firecracker-open-source-secure-fast-microvm-serverless/) — 125 ms boot, <5 MiB overhead
- [Running gVisor in production at scale at Ant](https://gvisor.dev/blog/2021/12/02/running-gvisor-in-production-at-scale-in-ant/) — 70% of apps <1% overhead
- [The TeX FAQ: spawning programs](https://texfaq.org/FAQ-spawnprog) — restricted shell escape
- [SyncTeX, TUGboat 29:3](https://tug.org/tugboat/tb29-3/tb93laurens.pdf) — Laurens' original description

**Peer-reviewed / academic**

- [Can You Accept LaTeX Files from Strangers? Ten Years Later](https://arxiv.org/abs/2102.00856) — attack demonstration, sandboxing vs command restriction
- [The True Cost of Containing: A gVisor Case Study](https://www.usenix.org/system/files/hotcloud19-paper-young.pdf) — syscall and I/O overhead measurements
- [SandboxEval: Towards Securing Test Environment for Untrusted Code](https://arxiv.org/pdf/2504.00018)

**Community / secondary**

- [Compilation speed: pdfLaTeX vs LuaLaTeX](https://gist.github.com/zr-tex8r/54e802a9d3099f879bc7899ea9e9fe5a) — Takayuki Yato, TeX Live 2025 hello-world timings
- [LuaLaTeX is disproportionately slow](https://github.com/latex3/latex2e/issues/1877) — latex3 issue tracker
- [TeX on Windows: TeX Live versus MiKTeX revisited](https://www.texdev.net/2016/12/18/tex-on-windows-tex-live-versus-miktex-revisited/) — Joseph Wright, on-the-fly install trade-offs
- [Speeding up LaTeX compilation](https://tony-zorman.com/posts/speeding-up-latex.html) — precompiled preambles, draft mode
- [tex-fast-recompile](https://pypi.org/project/tex-fast-recompile/) — preamble caching that tolerates Lua and OpenType
- [Collection of LaTeX log parsers](https://hackmd.io/@q/latex-log-parsers)
- [texoutparse](https://github.com/inakleinbottle/texoutparse) · [texlogparser](https://github.com/reitzig/texlogparser) · [pplatex](https://github.com/stefanhepp/pplatex)
- [latexrestricted](https://pypi.org/project/latexrestricted/) — `openin_any`/`openout_any` semantics
- [nsjail](https://github.com/google/nsjail) · [awesome-sandbox](https://github.com/restyler/awesome-sandbox)
