# ADR 0009: Use restricted shell escape, not disabled

**Status:** Accepted
**Revises:** the isolation row of [ADR 0008](0008-latex-compiler-stack.md)

## Context

ADR 0008 chose `shell_escape = f` — shell escape fully off — and recorded the cost: `minted`
and `gnuplottex` would not work, with `minted` being common in CS theses. That decision was
made from published descriptions of TeX Live's restricted mode. M0 measured the real thing
and two of the inputs were wrong.

**The allowlist is longer than published.** Read out of the shipped `texmf.cnf` (TeX Live
2026), `shell_escape_commands` has 13 entries, not the 8 that circulate online:

```
bibtex, bibtex8, extractbb, gregorio, kpsewhich, l3sys-query, latexminted,
makeindex, memoize-extract.pl, memoize-extract.py, repstopdf, r-mpost,
texosquery-jre8
```

**`latexminted` is on it.** Measured on fresh directories, with no `-shell-escape` flag:

| Configuration | Result |
|---|---|
| `shell_escape = f` (ADR 0008) | **minted fails** — "Missing definition for highlighting style" and "Cannot highlight code". A PDF is produced, with errors in the log and unhighlighted code |
| `shell_escape = p` (restricted) | **minted works fully.** Three cache files written, no errors, highlighted output |

Also measured: `\immediate\write18{id > pwned.txt}` is **blocked** under restricted mode. The
allowlist is an allowlist, not a blocklist.

The decisive context, though, is a different M0 finding: **`openin_any = p` does not stop
`\input`.** A document can read any absolute path — `/etc/passwd`, `/proc/self/environ` —
and typeset it. So arbitrary file read and OS-information disclosure are **already possible
with shell escape completely off**, and the container is already the sole barrier. That
removes most of the marginal risk that `f` was buying, including the objection to
`texosquery-jre8` being on the allowlist: a document can read `/proc` directly anyway.

## Decision

**Set `shell_escape = p` (restricted).** Never pass `-shell-escape` or
`--enable-write18`, which would turn it into unrestricted mode.

`openin_any = p` and `openout_any = p` are unchanged from ADR 0008.

## Consequences

- **`minted` works**, with no flag and no cache workaround. The day-one support question
  ADR 0008 flagged does not arise, and the `listings` fallback is not needed.
- `memoize` and `gregorio` work too, and `repstopdf` means EPS figures convert on the fly.
- **13 helper programs are now reachable from a hostile document.** This is a curated list
  vetted by the TeX Live security team, not something we assembled, but it is a real
  widening of the attack surface over `f`.
- **Argument injection against an allowlisted helper is the residual risk.** `repstopdf` and
  `epstopdf` have a history of exactly this. We are not relying on the allowlist being
  perfect — we are relying on the container, which is the same thing ADR 0008 already relied
  on once `\input` turned out to be unrestricted.
- The allowlist is **version-specific**. Re-read it from the image on every TeX Live upgrade
  rather than assuming it is stable, and treat a new entry as a change to review.
- If an allowlisted helper is ever found exploitable, the fallback is `f` plus a documented
  `listings` migration — a config change, not a rewrite.

### What would make this wrong

- A published exploit against an allowlisted helper that escapes the container.
- Deciding to serve a user population where `minted` is rare enough not to justify the
  surface.
