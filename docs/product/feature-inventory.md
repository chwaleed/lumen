# Feature inventory

What Lumen does today, derived by reading the code. Anything the UI implies but does not do
is listed as such, because a feature list that quietly includes aspirations is worse than
none.

Requirement IDs refer to the [SRS](../srs.md).

## Accounts

| Feature | Notes |
|---|---|
| Register with name, email, password | Email unique; password minimum 8 characters |
| Signed in immediately on registration | No second login step (FR-1.3) |
| Sign in / sign out | Sign-out revokes that session only |
| Silent session refresh | Expired 15-minute access tokens refresh before the page renders; the user never sees it (FR-1.7) |
| Session rotation | A refresh token is single-use — revoked as its replacement is issued (FR-1.8) |
| Route protection | Anonymous visitors bounce to login; signed-in users bounce off login/signup (FR-1.13, FR-1.14) |
| Account disable | `is_active = false` blocks login and refresh with a distinct message — no self-serve path to set it |

**Not present:** password reset (the "Forgot?" link goes nowhere), email verification,
social login, multi-factor, account deletion.

## Projects

| Feature | Notes |
|---|---|
| Create from a template | `blank` (default), `academic`, `math`, `presentation`, `resume`, `letter` |
| Seeded starting files | `main.tex` with the template; `academic` adds `references.bib` |
| List own projects | Scoped to the owner, always |
| Open with full file tree | One request returns the project and its entries |
| Rename | Blank names refused |
| Recency ordering | `updated_at` advances when any file inside changes, not just on rename |

**Not present:** delete a project, duplicate a project, archive, search, tags, sharing.

## File tree

| Feature | Notes |
|---|---|
| Create files and folders | At the root or inside a folder |
| Rename | Inline, in the sidebar |
| Move | Drag and drop, including back to the root |
| Delete | Removes the whole subtree |
| Sorting | Folders before files, then alphabetical |
| Expand state preserved | Survives a server refresh of the tree (FR-3.12) |
| Move guards | A folder cannot move into itself or any descendant, enforced on both client and server (FR-3.7, FR-3.8) |

## Editing

| Feature | Notes |
|---|---|
| Monaco editor with LaTeX highlighting | |
| Multiple open tabs | Re-opening a file reuses its tab and keeps unsaved content (FR-4.3, FR-4.4) |
| Opens `main.tex` by default | Falls back to the first file |
| Versioned saves | Every save appends a new immutable snapshot (FR-4.6) |
| Keystroke coalescing | Adjacent edits merge before transmission, so typing a word is one change (FR-4.7) |
| Image preview | Image files render as a picture instead of opening as text |
| Snippet insertion | Equation, figure, table, itemize, enumerate |
| Panel layout | Toggle editor, preview, sidebar; the last visible panel cannot be closed |
| Responsive | Sidebar and preview collapse on mobile |
| Word wrap toggle | |
| Light and dark themes | Follows the OS preference by default |

**Not present — and prominently so:** compilation. The Compile and Export PDF buttons have
no handlers, and the preview panel renders raw LaTeX source beneath a badge reading
"Auto-compile On" (FR-4.13/14/15).

## Uploads

| Feature | Notes |
|---|---|
| Image upload to S3 | Via presigned PUT; bytes never pass through the API |
| Image types only | Non-image content types rejected |
| Filename sanitisation | Directory components stripped; the object stays within the project's prefix |

Requires AWS credentials. Without them this is the only part of the app that fails.

## AI assistance

| Feature | Notes |
|---|---|
| Chat panel | Prompt entry, expand/collapse |
| Prompt history | Ten most recent, deduplicated, most recent first |
| Selection actions | Proof read / Rewrite / Improve compose a prompt from the selected text |

**All client-side.** No backend answers any of it (FR-6.3). The UI is complete; the
capability is not.

## Operations

| Feature | Notes |
|---|---|
| Automatic migrations | Run at application startup, so a deploy cannot serve a stale schema |
| Sentry error reporting | Optional; disabled when `SENTRY_DSN` is empty |
| Adminer | Database inspection at `:8080` in local compose |
| 243 automated tests | 98 backend, 121 frontend unit, 24 e2e — none run automatically yet |
