# Feature inventory

The complete product, and how much of it exists. Status is derived from the code, not from
intent — **Built** means working and tested today.

| Status | Meaning |
|---|---|
| ✅ **Built** | Working, covered by tests |
| 🟡 **Partial** | UI exists, capability does not |
| ⬜ **Planned** | Not started |

---

## Primary feature 1 — LaTeX compilation

**Free and unlimited on every plan.** This is the acquisition feature and the foundation
the agent stands on.

| Status | Feature | Notes |
|---|---|---|
| 🟡 | Compile a project to PDF | Buttons exist with no handlers; preview shows raw source beneath an "Auto-compile On" badge |
| ⬜ | Sandboxed compile service | TeX Live container, no shell-escape, CPU/memory/time caps |
| ⬜ | Multi-pass builds | `latexmk` for bibliography and cross-reference passes |
| ⬜ | PDF viewer | Page navigation, zoom, source ↔ output sync |
| ⬜ | Parsed error log | File, line, message — deduplicated, real error first |
| ⬜ | Error navigation | Click an error, land on the line |
| ⬜ | Warning surface | Overfull boxes, undefined references, missing citations |
| ⬜ | Build queue | Jobs, not inline requests; observable depth and wait time |
| ⬜ | Fair-use protection | Per-user concurrency, build timeout, project size ceiling |
| ⬜ | Engine selection | pdfLaTeX, XeLaTeX, LuaLaTeX |

## Primary feature 2 — Agentic AI

**Paid.** The reason anyone subscribes. Depends entirely on compilation existing first.

| Status | Feature | Notes |
|---|---|---|
| 🟡 | Chat panel | Prompt entry, expand/collapse — nothing answers it |
| 🟡 | Selection actions | Proof read / Rewrite / Improve compose a prompt nobody receives |
| ✅ | Prompt history | Ten most recent, deduplicated — client-side only |
| ⬜ | Agent tool loop | `list_files`, `read_file`, `write_file`, `compile`, `read_log` |
| ⬜ | Compile-fix iteration | Build, read the error, fix, repeat until clean |
| ⬜ | Multi-file editing | Create files, wire them with `\input`, update references |
| ⬜ | Project index | `\input` graph, `\label`/`\cite` map, section tree — what makes large projects work |
| ⬜ | Diff review | Show every change before it lands; nothing silent |
| ⬜ | Task cancellation | Stop a running task, keep partial work |
| ⬜ | Per-task ceilings | Max compiles, tokens and wall-clock per task |
| ⬜ | Visual verification | Render pages, check layout with a vision model |
| ⬜ | Autonomous project creation | Outline → structure → draft → compile → fix |
| ⬜ | Citation safety | Never invent a reference. Non-negotiable for academic use |

## Secondary feature — Templates

First-party only. No third-party sellers.

| Status | Feature | Notes |
|---|---|---|
| ✅ | Built-in starting templates | `blank`, `academic`, `math`, `presentation`, `resume`, `letter` |
| ✅ | New project from template | Seeds `main.tex`; `academic` adds `references.bib` |
| 🟡 | Templates page | Route exists; browsing is not a real catalogue |
| ⬜ | Template catalogue | Browse, preview, search, categorise |
| ⬜ | Premium templates | One-time purchase, permanent access |
| ⬜ | Entitlement checks | Who owns what, independent of subscription state |

---

## Platform

### Accounts and sessions

| Status | Feature | Notes |
|---|---|---|
| ✅ | Register, sign in, sign out | Email unique, password minimum 8 characters |
| ✅ | Signed in on registration | No second login step |
| ✅ | Silent session refresh | Expired access tokens refresh before render |
| ✅ | Session rotation | Refresh tokens are single-use |
| ✅ | Route protection | Anonymous bounced to login; signed-in bounced off login/signup |
| ✅ | Account disable | `is_active = false` blocks login and refresh |
| ⬜ | Password reset | "Forgot?" links nowhere today |
| ⬜ | Email verification | |
| ⬜ | Rate limiting on auth | Nothing slows credential stuffing |

### Projects and files

| Status | Feature | Notes |
|---|---|---|
| ✅ | Create from template, list, open, rename | Scoped to the owner, always |
| ✅ | Recency ordering | `updated_at` advances when any file inside changes |
| ✅ | Create, rename, move, delete files and folders | Drag and drop; subtree delete |
| ✅ | Move guards | A folder cannot move into itself or a descendant — enforced both sides |
| ✅ | Tree sorting and expand state | Folders first, alphabetical; expansion survives refresh |
| ⬜ | Delete a project | No endpoint exists |
| ⬜ | Duplicate, archive, search | |

### Editing

| Status | Feature | Notes |
|---|---|---|
| ✅ | Monaco editor, LaTeX highlighting | |
| ✅ | Multiple tabs | Re-opening reuses the tab and keeps unsaved content |
| ✅ | Versioned saves | Append-only snapshots — *every agent edit will be revertable for free* |
| ✅ | Keystroke coalescing | Adjacent edits merge before transmission |
| ✅ | Image preview, snippets, panel layout, word wrap | |
| ✅ | Light and dark themes | Follows OS preference |
| ⬜ | Realtime collaboration | Single owner; concurrent edits are last-write-wins |

### Uploads

| Status | Feature | Notes |
|---|---|---|
| ✅ | Image upload to S3 | Presigned PUT; bytes never pass through the API |
| ✅ | Type and filename safety | Images only; directory components stripped |
| ⬜ | Non-image assets | `.bib`, `.cls`, `.sty` cannot be uploaded — needed for real projects |

### Billing

| Status | Feature | Notes |
|---|---|---|
| ⬜ | Plans | Free, Pro, Max |
| ⬜ | Stripe Checkout and subscriptions | |
| ⬜ | Webhook → entitlement | Subscription state authoritative in our database |
| ⬜ | Agent task metering | Count, enforce, show remaining |
| ⬜ | Template purchases | One-time, permanent |
| ⬜ | Billing portal | Upgrade, downgrade, cancel, invoices |

### Operations

| Status | Feature | Notes |
|---|---|---|
| ✅ | Automatic migrations at startup | Cannot serve a stale schema. Races if instances scale out |
| ✅ | 243 automated tests | 98 backend, 121 frontend unit, 24 e2e |
| ✅ | Sentry error reporting | Optional |
| ⬜ | CI | Nothing runs the tests automatically |
| ⬜ | Secure cookies | Deliberately disabled until TLS exists |
| ⬜ | Usage and cost telemetry | Cost per agent task is the number the business turns on |

---

## Where this leaves the product

```
Platform (accounts, projects, files, editing)   ████████████████████  built
Templates — basic                               ████████░░░░░░░░░░░░  seeding works, no catalogue
Compilation                                     ░░░░░░░░░░░░░░░░░░░░  not started
Agentic AI                                      █░░░░░░░░░░░░░░░░░░░  UI shell only
Billing                                         ░░░░░░░░░░░░░░░░░░░░  not started
```

The editor is real and well tested. **Neither primary feature exists yet** — and the second
cannot start until the first works, because an agent with no compiler is a chatbot. See
[roadmap.md](roadmap.md) for the order, and
[ai-agent-vision.md](ai-agent-vision.md) for why compilation is the hard part.
