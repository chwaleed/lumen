# Project import and export (zip)

**Status:** done — 2026-10-09

Every major LaTeX editor lets you leave with your work and arrive with someone else's.
Overleaf, Papeeria and TeXpage all do zip in both directions, and a user evaluating us
asks for it early: it is how they get their existing thesis in, and how they satisfy
themselves they are not locked in.

## Progress

| | Milestone | Status |
|---|---|---|
| **M1** | Safe archive reading — the zip trust boundary | ✅ |
| **M2** | Export a project as a zip | ✅ |
| **M3** | Import a zip as a new project | ✅ |
| **M4** | Export from the editor UI | ✅ |
| **M5** | Import from the dashboard UI | ✅ |
| **M6** | End-to-end: the round trip in a browser | ✅ |

Each milestone ships with its own tests. The e2e comes last, once there is a full path
to drive.

---

## What the data model forces

A project is a `file_entries` adjacency tree. Each file's bytes live in one of two places,
and which one decides whether the user can edit it:

| Kind | Stored as | Editable |
|---|---|---|
| Text the user writes — `.tex`, `.bib`, `.cls` | `file_snapshots` rows, append-only | yes, in Monaco |
| Binary assets — `.png`, `.pdf`, `.eps` | S3, `file_entries.file_url` | no |

So **import is not one operation but two**, chosen per entry by extension. Getting this
wrong is not a crash, it is a project where `references.bib` cannot be edited because it
was filed as an asset. `references.bib` is already a snapshot in every project we create
from a template, and import must agree with that.

Export is the reverse walk, and most of it already exists: `project_source_paths()` in
`src/compiles/service.py` returns every file with its path, and the compile worker already
resolves snapshots and S3 objects to bytes. Export is that walk into a `ZipFile` instead of
onto a disk.

## Scope

**In:** zip in, zip out, through the UI, for the whole project.

**Out, deliberately:**

- **Importing into an *existing* project.** Merge semantics (replace? union? conflicts?)
  are a separate design problem. Import creates a new project.
- **Other formats.** No tarballs, no Overleaf-specific bundles, no git.
- **Exporting compile output.** The zip is sources. The PDF already has its own button.
- **Preserving history.** Snapshots are per-file and append-only; a zip has no history to
  carry. An imported file starts at version 1.

---

## M1 — Safe archive reading

A zip from a stranger's desktop is the most hostile input this product accepts. It is
parsed before anything else happens, so it gets its own module, `src/archives/service.py`,
and its own tests before any endpoint exists.

What it must refuse:

| Attack | Why it matters here |
|---|---|
| Path traversal (`../../etc/passwd`, `/abs/path`, `C:\`, backslash separators) | Entry names become folder names, and the compile worker later writes them to disk |
| Symlinks | A zip can store one; following it reads host files into the project |
| Zip bombs | A 42 KB zip can expand to petabytes. Cap total uncompressed bytes, per-file bytes and entry count — read from the *header*, then enforce again while streaming, because the header lies |
| Deep nesting | The materialiser already caps depth at 64; reject earlier with a clear message |
| Encrypted entries | Cannot be read, and the error should say so rather than surfacing a `RuntimeError` |

What it should quietly tolerate, because real zips are messy:

- `__MACOSX/` and `.DS_Store` — macOS puts them in every zip made from Finder
- A single wrapping top-level folder (`thesis/main.tex`), which is what you get from
  "compress this folder". Collapsed, or every imported project gains a pointless level
- Directory entries that are implied rather than stored
- Unknown extensions — skipped and reported, not fatal

---

## M2 — Export a project as a zip

`GET /projects/{id}/export`, streaming `application/zip`.

Reuses `project_source_paths()`, which moved to `src/shared/project_files.py` so export
does not have to depend on the compiles package for it. Text entries resolve through the
latest snapshot; asset entries through S3.

**Empty folders are dropped.** A zip has no way to carry one that survives a round trip
through a tree keyed on files, and nothing in LaTeX needs it. Said here because the first
draft of this plan claimed the opposite.

## M3 — Import a zip as a new project

`POST /projects/import`, returning the created project.

**The zip is the raw request body, not multipart.** Multipart would mean adding
`python-multipart` for this one endpoint, and a browser can put a `File` straight into
fetch's body with no wrapper. The original filename rides along as `?file_name=`, which
is what the project gets named.

Per entry: text extensions become `file_entries` + a first `file_snapshot`; asset
extensions are uploaded to S3 server-side (`put_object` — we already hold the bytes, so
there is no presigned round trip); anything else is skipped and named in the response.

## M4 / M5 — The UI

**Export is a File-menu item, not a fifth top-bar button.** Save, Compile and Export PDF
already crowd that bar, and a download belongs under File.

**Import replaced a dead button.** The dashboard header already had an "Import .tex"
button wired to nothing. A control that does nothing teaches users not to trust the rest
of the interface — the same reasoning that removed the fake "Auto-compile On" badge — so
the real importer took its place rather than sitting next to it.

**A successful import opens the project, unless files were skipped.** In that case it
stays on the dashboard and names them, with a button through to the project. Navigating
immediately would flash the list for a frame and throw it away, and "three of your figures
did not come over" is exactly what a user must not miss.

## M6 — End to end

`tests/e2e/archives/import-export.spec.ts`, seven tests, `@backend`.

The round trip uses the app's own export as the import fixture, so neither half is proved
against a hand-written zip. The one test that needs an archive we would never produce —
carrying a `Makefile` and a `.docx` — builds it with a 50-line STORED-zip writer rather
than adding a zip dependency for a single file.
