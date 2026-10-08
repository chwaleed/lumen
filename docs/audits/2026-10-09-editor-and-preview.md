# Audit — editor, PDF preview, file rendering

**Date:** 2026-10-09  
**Scope:** the whole path a user touches — opening files, rendering images,
compiling, reading errors, viewing the PDF — with the failure modes deliberately
provoked rather than reasoned about.

Everything below was reproduced in a real browser against a running backend,
worker and Docker before it was changed.

---

## Headline

Three things were broken in ways a user would hit on their first day:

1. **The spinner never stopped.** With no compile worker running, the UI said
   "Queued" and span indefinitely. Nothing in the system could ever move that
   job to a terminal state.
2. **Images did not load at all.** Every figure showed a 135×26 broken-image
   icon with no message.
3. **The status bar was fabricated.** "Ln 14, Col 23", "Words: 42" — literals,
   identical for every file.

---

## Reliability

### The compile could hang for ever

Two independent causes, both fixed.

| | Before | Now |
|---|---|---|
| Server | `reap_stale_jobs` ran **only inside the worker loop**. No worker meant nothing ever reaped, and the API kept answering `queued`. | Jobs settle when they are **read**. A job nothing claimed within `COMPILE_QUEUE_TIMEOUT_SECONDS` (120s) fails with a message saying the build service may be down. |
| Client | `for (let attempt = 0; ; attempt += 1)` — no deadline. | A 15-minute backstop, and the loop says so when it gives up. |

A worker that dies mid-build now reports **failure**, not timeout. Calling it a
timeout would send the user optimising a document that was never the problem;
`compile.sh` still reports a genuine wall-clock timeout itself, with its own
message naming the limit.

**A latent crash came out of this.** `settle_job` compares timestamps, and
Postgres returns timezone-aware datetimes where SQLite returns naive ones.
Comparing the two raises — on a code path that runs on *every status poll*. The
tests caught it; it would have 500'd the entire polling path.

### One dropped poll killed a healthy build

A single failed request set `status: failure, "Lost track of the compile."`
Wi-Fi blips and dev servers restart. Four consecutive failures are now needed,
except for a 404, which is final and fails immediately.

### A reload threw the build away

The PDF vanished and the pane claimed the project had never been compiled.
`GET /projects/{id}/compile/latest` restores the newest job on mount, and a
build still running is resumed with the same deadline and tolerance.

### A huge log could take out the API and the tab

`path.read_text()` with no bound. M0 produced a **186 MB** log from a runaway
document; serving that exhausts the API and then kills the browser. Capped at
2 MB, keeping both ends — errors are usually early, the summary is always last —
with the omission stated in the log itself rather than silently truncated.

---

## Errors

### The reason is now stated, always

A build that failed for a non-LaTeX reason gave a red badge over an empty
problem list — no explanation anywhere. `compile_jobs.failure_reason` now
records it, and the preview shows it in a banner:

- no `.tex` to compile, or an unreadable figure → the materialiser's own message
- the container would not start → the first line of its stderr
- exited non-zero but the log parsed cleanly → says so, and points at the Log tab
- nothing claimed the job → the build service may be down
- the worker died → "Nothing is wrong with your document — try again."

### Errors name what they choked on

`Undefined control sequence.` → **`Undefined control sequence \badcommand`**,
with the source TeX echoed back and the point it stopped reading marked:

```
Here is a \badcommand ⟨?⟩ that does not exist.
```

TeX prints this on the `l.<N>` line following the error. We were discarding it.

### A failed build no longer hides its errors behind the PDF

pdfLaTeX often emits a PDF *and* fails. The pane defaulted to the PDF, so a
broken build looked finished and the errors sat behind a chip. A failed run now
opens on its problems, and the banner says a PDF was produced but may be
incomplete.

---

## Images and file rendering

### They were loading from the object store directly

`file_entries.file_url` held an **unsigned S3 URL** that the `<img>` tag fetched
itself. That only renders from a world-readable bucket — which hands every
project's figures to anyone who learns the key — and on a private bucket it is a
broken icon. Images now load through `GET /projects/{id}/files/{fileId}/raw`,
behind the same ownership check as everything else.

### Oversized figures

A 1600×1425 diagram is scaled to fit the pane (`max-h-full max-w-full
object-contain`) rather than forcing the editor to scroll. The real pixel size
is printed in the corner, because "it looks small" and "it is small" are
otherwise indistinguishable. Loading and error states replaced the bare broken
icon, and the error names the file.

---

## UI flaws found and fixed

| Flaw | Why it mattered |
|---|---|
| Status bar was entirely hardcoded | Numbers that never change teach people the interface is decorative — the same lesson the dead "Import .tex" button and the fake "Auto-compile On" badge were teaching |
| Word count would have counted markup | `\\section{Intro}` is one word, not three; maths counts as nothing, as texcount does |
| Empty state said "No preview yet" after a failed build | Reads as "you have not compiled", the opposite of what happened |
| Empty state promised a log that a build which never ran has not got | — |

---

## Still open

- **The compile worker is still not in `docker compose`.** Documented in
  CLAUDE.md; containerising it needs the Docker socket *and* bind-mount paths
  identical to the host's.
- **Uploads still write a public S3 URL** into `file_url`. Reading now goes
  through the API, so nothing depends on that URL being reachable, but the
  bucket should be made private and the column reduced to an object key.
- **No per-user rate limit on compiles**, only a concurrency cap of 2. A loop
  that queues a build per keystroke would still be accepted.
- **SyncTeX is produced but unused** — clicking an error opens the file and the
  line, but clicking the PDF does not jump to the source.
- **`compile_output_dir` grows without bound.** Nothing prunes the PDFs and logs
  of old jobs.
