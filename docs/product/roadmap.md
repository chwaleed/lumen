# Roadmap

**STATUS: PARTIAL TEMPLATE** — the *Known gaps* section is real, derived from the code. The
sequencing and themes need a product owner.

## Known gaps

These are facts, not plans: each is a capability the product implies but does not have.
Pulled from the [SRS](../srs.md) `[PROPOSED]` entries and [SDD §9](../sdd.md#9-known-design-debt).

### Blocks the core value proposition

| Gap | Detail |
|---|---|
| **No LaTeX compilation** | A LaTeX editor that cannot produce a PDF. The preview shows raw source while the UI reads "Auto-compile On", and the Compile and Export PDF buttons have no handlers (FR-4.13/14/15). |
| **No AI backend** | The chat panel and the selection actions (Proof read / Rewrite / Improve) compose prompts that nothing answers (FR-6.3). |

### Blocks public deployment

| Gap | Detail |
|---|---|
| **Cookies are not `Secure`** | Deliberate while there is no TLS or final domain, and must be reversed first (NFR-S5, C-2). |
| **No rate limiting on auth** | Nothing slows credential stuffing (NFR-S9). |
| **No CI** | The deploy workflow is commented out pending a server, and nothing runs the 243 tests automatically. |

### Expected by users

| Gap | Detail |
|---|---|
| **No password reset** | The login form links to "Forgot?" and no flow exists behind it (FR-1.15). |
| **No project deletion** | Projects can be created and renamed, never removed (FR-2.9). |
| **No sharing or collaboration** | One project, one owner; concurrent edits are last-write-wins (C-1, NFR-R5). |

### Engineering debt

| Gap | Detail |
|---|---|
| **Tests run on SQLite, production is Postgres** | One migration uses `batch_alter_table`, which exists because SQLite cannot `ALTER` — the likeliest case to diverge. Fixtures already read the URL from an env var. |
| **Snapshots are never pruned** | Whole file content per version, growing without bound. |
| **Subtree operations recurse per level** | One query per tree level; a recursive CTE if trees grow large. |

---

## Sequencing

**TEMPLATE.** Which of the above comes first, and why. Worth noting that the first table
arguably outranks everything else: the product does not yet do the thing its name implies.

## Themes

**TEMPLATE.** Group work into a few named themes rather than a flat list, so the direction
is legible.

## Out of scope

**TEMPLATE.** What has been explicitly decided against, and when, so it stops being
re-proposed.
