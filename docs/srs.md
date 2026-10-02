# Software Requirements Specification — Lumen

**Version:** 1.0 · **Status:** Baselined against the implementation as of this commit

> **How to read this.** Sections 1–4 are **descriptive**: they were derived by reading the
> code and tests, so they state what Lumen demonstrably does today. Requirements carrying
> **`[ASSUMED]`** are inferred intent — the behaviour is implemented, but no written source
> confirms it was the goal. Requirements carrying **`[PROPOSED]`** are not implemented and
> are listed so the gap is explicit. A product owner should confirm or correct both.
>
> Each requirement has an ID so design (SDD) and tests can cite it. See
> [§7 Traceability](#7-traceability).

---

## 1. Introduction

### 1.1 Purpose

Specifies the functional and non-functional requirements for Lumen, a browser-based LaTeX
editor. The audience is anyone changing the system: developers, reviewers, and whoever
decides what it should do next.

### 1.2 Scope

Lumen lets a registered user create LaTeX projects, organise them as a file tree, edit
source in a code editor with version history, and upload images. It runs as a web
application; there is no desktop or mobile client.

**Out of scope today:** LaTeX compilation to PDF, realtime multi-user collaboration,
project sharing, and the AI assistance the UI gestures at. See §6.

### 1.3 Definitions

| Term | Meaning |
|---|---|
| **Project** | A LaTeX document workspace owned by exactly one user |
| **File entry** | A node in a project's tree — a file or a folder |
| **Snapshot** | An immutable version of one file's content |
| **Access token** | Short-lived JWT (15 min default) authorising API calls |
| **Refresh token** | Longer-lived JWT (7 days default) exchangeable for a new pair |
| **Session** | A refresh-token row; revoking it ends that device's access |
| **Envelope** | The uniform `{success, message, data}` API response shape |

### 1.4 References

- [Software Design Document](sdd.md) — how these requirements are met
- [Architecture decisions](decisions/) — why specific approaches were chosen
- [Testing strategy](testing/strategy.md) — how requirements are verified

---

## 2. Overall description

### 2.1 Product perspective

A three-tier web application. A Next.js server renders the UI and is the **only** client of
the FastAPI service; browsers never reach the API directly. PostgreSQL stores all state.
S3 stores uploaded images.

### 2.2 User classes

| Class | Description |
|---|---|
| **Anonymous visitor** | Can view the landing page and register or sign in. Nothing else. |
| **Registered user** | Full access to their own projects. The only authenticated role. |

There is no administrator role, no org or team concept, and no permission tiers. Every
registered user has identical capability over their own data and none over anyone else's.

### 2.3 Operating environment

Modern evergreen browsers (the editor depends on Monaco). Server side: Python 3.13,
PostgreSQL 16, Node 24 / bun 1.4 runtime, Docker.

### 2.4 Constraints

| | |
|---|---|
| **C-1** | A project has exactly one owner. No schema supports sharing. |
| **C-2** | Session cookies are **not** marked `Secure` — a deliberate temporary measure until TLS and a final domain exist (`lib/auth/cookies.ts`). Must be reversed before any public deployment. |
| **C-3** | Image uploads require AWS credentials; without them the upload endpoint fails while all else works. |
| **C-4** | Schema changes must ship as Alembic revisions; migrations run at application startup. |

### 2.5 Assumptions and dependencies

- Users supply their own LaTeX knowledge; Lumen does not validate LaTeX syntax.
- S3 is reachable from the browser for direct uploads.
- The deployment terminates TLS in front of the Next server (not yet true — see C-2).

---

## 3. Functional requirements

### 3.1 Account and session management

| ID | Requirement | Status |
|---|---|---|
| **FR-1.1** | A visitor shall register with name, email and password; email must be unique. | Implemented |
| **FR-1.2** | Passwords shall be at least 8 characters, enforced client-side before any request. | Implemented |
| **FR-1.3** | Registration shall establish a session immediately, placing the user on the dashboard without a second login. | Implemented |
| **FR-1.4** | Registering with an existing email shall be refused with a message naming the cause. | Implemented |
| **FR-1.5** | A user shall sign in with email and password, receiving an access/refresh token pair. | Implemented |
| **FR-1.6** | Invalid credentials shall be refused without revealing which field was wrong. | Implemented |
| **FR-1.7** | An expired access token shall be refreshed silently, without interrupting the user. | Implemented |
| **FR-1.8** | Using a refresh token shall revoke it and issue a replacement (rotation). | Implemented |
| **FR-1.9** | A revoked, expired, or unknown refresh token shall be rejected. | Implemented |
| **FR-1.10** | A user shall sign out, revoking that session's refresh token. | Implemented |
| **FR-1.11** | A user shall not revoke a token belonging to another user. | Implemented |
| **FR-1.12** | An inactive account shall be refused login and refresh with a distinct message. | Implemented |
| **FR-1.13** | Anonymous access to a protected route shall redirect to login. | Implemented |
| **FR-1.14** | A signed-in user visiting login or signup shall be redirected to the dashboard. | Implemented |
| **FR-1.15** | Password reset. | **[PROPOSED]** — the login form links to "Forgot?" but no flow exists |

### 3.2 Project management

| ID | Requirement | Status |
|---|---|---|
| **FR-2.1** | A user shall create a project with a name and an optional template. | Implemented |
| **FR-2.2** | Templates shall offer `blank` (default), `academic`, `math`, `presentation`, `resume`, `letter`. | Implemented |
| **FR-2.3** | A new project shall be seeded with `main.tex` containing the template; `academic` shall additionally seed `references.bib`. | Implemented |
| **FR-2.4** | A user shall list their own projects, and only their own. | Implemented |
| **FR-2.5** | A user shall retrieve a project with its full file tree. | Implemented |
| **FR-2.6** | A user shall rename a project; blank names shall be refused. | Implemented |
| **FR-2.7** | Requesting a project owned by another user shall return 404, not 403, so ids cannot be probed. | Implemented |
| **FR-2.8** | A project's `updated_at` shall advance when any file within it changes. | Implemented |
| **FR-2.9** | Project deletion. | **[PROPOSED]** — no endpoint exists |

### 3.3 File tree

| ID | Requirement | Status |
|---|---|---|
| **FR-3.1** | A user shall create a file or folder, at the root or inside a folder. | Implemented |
| **FR-3.2** | Entry names shall be trimmed; blank names shall be refused. | Implemented |
| **FR-3.3** | An entry shall not be created inside a file — only inside folders. | Implemented |
| **FR-3.4** | An entry shall not be created under a parent belonging to another project. | Implemented |
| **FR-3.5** | A user shall rename an entry. | Implemented |
| **FR-3.6** | A user shall move an entry into a folder, or to the project root. | Implemented |
| **FR-3.7** | A folder shall not be moved into itself. | Implemented |
| **FR-3.8** | A folder shall not be moved into any of its own descendants, at any depth. | Implemented |
| **FR-3.9** | Deleting a folder shall delete its entire subtree, leaving no unreachable rows. | Implemented |
| **FR-3.10** | The tree shall display folders before files, each alphabetically. | Implemented |
| **FR-3.11** | Root folders shall start expanded; nested folders shall start collapsed. | Implemented |
| **FR-3.12** | Expand/collapse state shall survive a server refresh of the tree. | Implemented |
| **FR-3.13** | All tree operations shall be rejected for a project the user does not own. | Implemented |

### 3.4 Editing

| ID | Requirement | Status |
|---|---|---|
| **FR-4.1** | A user shall edit file content in a syntax-highlighted LaTeX editor. | Implemented |
| **FR-4.2** | Opening a project shall open `main.tex` by default, or the first file if absent. | Implemented |
| **FR-4.3** | Multiple files shall be open as tabs; re-opening a file shall not duplicate its tab. | Implemented |
| **FR-4.4** | Unsaved buffer content shall survive re-opening a file. | Implemented |
| **FR-4.5** | Closing the active tab shall activate the neighbouring tab. | Implemented |
| **FR-4.6** | Saving shall append a new immutable version; existing versions shall never be modified. | Implemented |
| **FR-4.7** | Edits shall be transmitted as change ranges, coalesced client-side, not as whole files. | Implemented |
| **FR-4.8** | A change range outside the stored content shall be rejected rather than corrupting the file. | Implemented |
| **FR-4.9** | Image files shall render as a preview instead of opening in the text editor. | Implemented |
| **FR-4.10** | A user shall insert LaTeX snippets (equation, figure, table, itemize, enumerate). | Implemented |
| **FR-4.11** | A user shall toggle the editor, preview and sidebar panels; the last visible panel shall not be closable. | Implemented |
| **FR-4.12** | On a mobile viewport the sidebar and preview shall start collapsed. | Implemented |
| **FR-4.13** | Compile the document to PDF. | **[PROPOSED]** — button present, not wired |
| **FR-4.14** | Export the document as PDF. | **[PROPOSED]** — button present, not wired |
| **FR-4.15** | The preview panel shall render compiled output. | **[PROPOSED]** — currently shows raw source while labelled "Auto-compile On" |

### 3.5 Uploads

| ID | Requirement | Status |
|---|---|---|
| **FR-5.1** | A user shall upload an image into a project via a presigned S3 URL. | Implemented |
| **FR-5.2** | Only `image/*` content types shall be accepted. | Implemented |
| **FR-5.3** | Directory components in a filename shall be stripped, confining the object to the project's prefix. | Implemented |
| **FR-5.4** | Image bytes shall go browser-to-S3, never through the API. | Implemented |
| **FR-5.5** | A presigned URL shall not be issued for another user's project. | Implemented |

### 3.6 AI assistance

| ID | Requirement | Status |
|---|---|---|
| **FR-6.1** | A user shall select text and send it for proof-reading, rewriting or improvement. | **Partial** — the UI composes the prompt; nothing processes it |
| **FR-6.2** | Prompt history shall retain the 10 most recent prompts, deduplicated. | Implemented (client-only) |
| **FR-6.3** | Prompts shall be answered by a model. | **[PROPOSED]** — no backend exists |

---

## 4. Non-functional requirements

### 4.1 Security

| ID | Requirement | Status |
|---|---|---|
| **NFR-S1** | Passwords shall be stored bcrypt-hashed with a per-user salt, never plaintext. | Implemented |
| **NFR-S2** | Refresh tokens shall be stored as SHA-256 hashes, so a database leak yields no usable session. | Implemented |
| **NFR-S3** | Session tokens shall be in httpOnly cookies, unreadable by client scripts. | Implemented |
| **NFR-S4** | Cookies shall use `SameSite=Lax`. | Implemented |
| **NFR-S5** | Cookies shall be marked `Secure` in any environment served over HTTPS. | **Not met** — deliberately disabled (C-2) |
| **NFR-S6** | Cross-user access shall be indistinguishable from a missing resource (404). | Implemented |
| **NFR-S7** | The API port shall not be reachable from the public internet. | Implemented in prod compose |
| **NFR-S8** | Each refresh token shall be independently revocable via its `jti`. | Implemented |
| **NFR-S9** | Rate limiting on authentication endpoints. | **[PROPOSED]** — none exists |

### 4.2 Reliability and data integrity

| ID | Requirement | Status |
|---|---|---|
| **NFR-R1** | File history shall be append-only; a save shall never destroy a prior version. | Implemented |
| **NFR-R2** | Schema migrations shall apply automatically at startup, so a deploy cannot run against a stale schema. | Implemented |
| **NFR-R3** | Deleting a user shall cascade to their sessions, projects, files and history. | Implemented |
| **NFR-R4** | An unreachable API shall surface a clear failure, never a silent success. | Implemented |
| **NFR-R5** | Concurrent edits to one file shall be reconciled. | **[PROPOSED]** — last write wins |

### 4.3 Usability

| ID | Requirement | Status |
|---|---|---|
| **NFR-U1** | Token expiry shall never surface as an unexpected logout during normal use. | Implemented |
| **NFR-U2** | Every error shown to a user shall be specific to its context, never a generic or blank message. | Implemented |
| **NFR-U3** | The interface shall support light and dark themes, following the OS preference by default. | Implemented |
| **NFR-U4** | Colours shall come only from semantic design tokens, so theming stays consistent. | Implemented |
| **NFR-U5** | Full keyboard accessibility and screen-reader support shall be verified. | **[ASSUMED]** — partial; not audited |

### 4.4 Maintainability

| ID | Requirement | Status |
|---|---|---|
| **NFR-M1** | Business logic shall live in services, keeping routers thin and testable without HTTP. | Implemented |
| **NFR-M2** | Configuration shall flow through one settings object, not scattered environment reads. | Implemented |
| **NFR-M3** | Authorisation shall route through one shared function rather than being re-implemented per router. | Implemented |
| **NFR-M4** | Every feature shall own a test folder of the same name in each test tree. | Implemented |
| **NFR-M5** | Changes shall be committed in small, traceable increments. | Implemented (`CLAUDE.md`) |

### 4.5 Performance

| ID | Requirement | Status |
|---|---|---|
| **NFR-P1** | Keystrokes shall be coalesced so typing does not produce one request per character. | Implemented |
| **NFR-P2** | File-tree reads shall be indexed by project and parent. | Implemented |
| **NFR-P3** | Image uploads shall not occupy an API worker. | Implemented |
| **NFR-P4** | Quantified latency and throughput targets. | **[PROPOSED]** — none defined; no load testing done |

---

## 5. External interfaces

### 5.1 User interface

Routes: `/` (landing), `/login`, `/signup`, `/dashboard`, `/projects`, `/templates`,
`/project/{id}`. The last four require a session.

### 5.2 API

All responses use the envelope `{success, message, data}`; `message` is `null` when the
server supplied none, so each client supplies its own wording. Full endpoint table:
[backend README](../backend/README.md#api). Interface design: [SDD §5](sdd.md#5-interface-design).

### 5.3 External services

| Service | Used for | Failure behaviour |
|---|---|---|
| **S3** | Image storage via presigned PUT | Upload endpoint fails; rest of the app unaffected |
| **Sentry** | Error reporting | Optional; disabled when `SENTRY_DSN` is empty |

---

## 6. Known gaps

Consolidated from the `[PROPOSED]` entries above, because these are what a reader most
needs to know:

1. **No LaTeX compilation.** The core value proposition of a LaTeX editor is unimplemented;
   the preview shows source while claiming to auto-compile (FR-4.13/14/15).
2. **No AI backend.** The chat and selection actions compose prompts nobody answers (FR-6.3).
3. **No password reset** (FR-1.15) and **no project deletion** (FR-2.9).
4. **Cookies are not `Secure`** (NFR-S5) — must be fixed before public deployment.
5. **No rate limiting** on authentication (NFR-S9).
6. **No collaboration or conflict resolution** (NFR-R5).
7. **No performance targets** and no load testing (NFR-P4).

---

## 7. Traceability

Requirements are verified by the test suite. Representative mapping:

| Requirements | Verified by |
|---|---|
| FR-1.1 – FR-1.12 | `backend/tests/api/auth/`, `backend/tests/unit/auth/test_utils.py` |
| FR-1.2, FR-1.5, FR-1.6 | `frontend/tests/unit/auth/login-hook.test.ts`, `signup-hook.test.ts` |
| FR-1.13, FR-1.14 | `frontend/tests/e2e/dashboard/projects.spec.ts` (route protection) |
| FR-2.x | `backend/tests/api/projects/`, `backend/tests/unit/projects/` |
| FR-2.7, FR-3.13, FR-5.5, NFR-S6 | `backend/tests/unit/shared/test_project_access.py` |
| FR-3.1 – FR-3.9 | `backend/tests/unit/file_entries/test_service.py`, `tests/api/file_entries/` |
| FR-3.10 – FR-3.12 | `frontend/tests/unit/projects/file-tree.test.ts`, `unit/editor/file-tree-utils.test.ts` |
| FR-4.2 – FR-4.5, FR-4.11, FR-4.12 | `frontend/tests/unit/editor/project-editor-store.test.ts` |
| FR-4.7, NFR-P1 | `project-editor-store.test.ts` — "pending snapshot change compaction" |
| FR-4.1, FR-4.3 | `frontend/tests/e2e/editor/workspace.spec.ts` |
| FR-5.1 – FR-5.5 | `backend/tests/unit/uploads/test_service.py`, `tests/api/uploads/` |
| FR-6.2 | `project-editor-store.test.ts` — "AI chat prompt history" |
| NFR-S1, NFR-S2, NFR-S8 | `backend/tests/unit/auth/test_utils.py` |
| NFR-S3, NFR-S4, NFR-S5 | `frontend/tests/unit/auth/cookies.test.ts` |
| NFR-R1 | `backend/tests/unit/file_snapshots/test_service.py` |
| NFR-R2 | `backend/tests/unit/db/test_migrations.py` |
| NFR-R4, NFR-U2 | `frontend/tests/unit/http/client.test.ts` |

Requirements with no test are the `[PROPOSED]` ones — they are not implemented.
