# ADR 0007: Keep append-only full-content snapshots, and defer compressing them

**Status:** Accepted

## Context

`FileSnapshot.content` is a full `Text` column, so **every save stores a complete copy of
the file** in Postgres. The table is append-only and nothing prunes it. At roughly 30 KB per
thesis chapter and a few hundred saves per file, this projects to ~80–100 GB per 1,000
active projects after TOAST compression.

That looks like a design mistake. It is not — it is the same shape Git uses. Git stores
whole snapshots as content-addressed blobs, not diffs; dedup falls out of hashing content,
and delta compression happens later in a background repack. **Git's write path is as naive
as ours.** All of its sophistication is in a batch job.

Four optimisations are available:

| | Option | Win | Cost |
|---|---|---|---|
| 1 | Skip the insert when the content hash is unchanged | Marginal today — the Monaco path always changes content. Real once the agent retries writes | A column, so a migration |
| 2 | Coalesce saves inside a time window into one version | **~10×** | ~30 lines, and needs a human-vs-agent distinction that does not exist yet |
| 3 | Store deltas between periodic full snapshots | Large | Real complexity; slows reads, which the agent needs fast |
| 4 | Content-addressed blobs in S3, hash in Postgres | Large, and cheaper per GB | Latency and a consistency problem |

Worth recording for whoever picks this up: the client already sends
`MonacoContentChange` diffs, which `create_file_snapshot_from_monaco_changes` expands into
full content. **Option 3 would not need to compute diffs — they are already being handed to
us and discarded.**

Against all of this: there are no users, and compilation — which blocks every other phase —
does not exist. Disk is a projected problem, not a present one.

## Decision

**Keep the append-only full-content model unchanged.** It is correct, and the append-only
property is load-bearing rather than accidental: it is what makes every agent edit a
revertable version for free, which is the main safety mechanism behind agent editing.

Specifically:

- **Now:** change nothing.
- **Opportunistically:** add a `content_hash` column the next time a migration touches this
  area. The column is free against a small table and awkward to add against a large one.
  Option 1 then becomes a two-line comparison, since `create_file_snapshot` already loads
  the previous row to compute the next version number.
- **With the agent (Phase 2):** implement options 1 and 2 together. **Coalescing must never
  apply to agent writes** — only to human keystroke batches. Folding agent edits together
  destroys the revertability the agent depends on.
- Options 3 and 4 need a measured number before anyone builds them.

## Consequences

- Disk grows at ~80–100 GB per 1,000 active projects, and the agent multiplies it: twenty
  iterations touching ten files is 200 snapshots per task, per task rather than per session.
  This needs a monitoring alert long before it needs engineering.
- Nothing is built now, so the first thousand projects are cheap and the engineering happens
  when there is data to size it against.
- **The cost of waiting is a migration on a non-empty table** if the `content_hash` column
  is forgotten. That is the one thing in this ADR with a deadline.
- Coalescing is blocked on a distinction the code cannot yet make. Whoever introduces the
  agent's write path must mark its snapshots as agent-authored, or option 2 cannot be
  implemented safely afterwards.
- If snapshot reads ever become hot, `default_toast_compression = lz4` (PG 14+) is a config
  line, not a code change. Note that values under ~2 KB stay inline and uncompressed either
  way.
