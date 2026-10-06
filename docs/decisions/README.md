# Architecture decision records

One file per decision that was non-obvious, costly to reverse, or likely to be questioned
later. The point is to preserve the *reasoning*, so a future reader can tell a deliberate
choice from an accident — and knows what would have to change for the choice to be wrong.

## Index

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-bun-as-the-frontend-package-manager.md) | bun as the frontend package manager | Accepted |
| [0002](0002-run-migrations-at-application-startup.md) | Run migrations at application startup | Accepted |
| [0003](0003-return-404-for-another-users-resource.md) | Return 404, not 403, for another user's resource | Accepted |
| [0004](0004-feature-folders-for-tests.md) | Organise tests by feature, not by type | Accepted |
| [0005](0005-screenshots-as-e2e-proof.md) | E2E tests capture named screenshots as proof | Accepted |
| [0006](0006-report-missing-api-messages-as-null.md) | Report a missing API message as null | Accepted |
| [0007](0007-append-only-full-content-snapshots.md) | Keep append-only full-content snapshots, defer compressing them | Accepted |
| [0008](0008-latex-compiler-stack.md) | Compile with latexmk and pdfTeX on pinned TeX Live, isolated per compile | Accepted |

## Writing one

Copy the shape of an existing record: **Context** (the forces, including the option you
rejected), **Decision** (what was chosen, in the present tense), **Consequences** (what this
buys, what it costs, and what would make it wrong).

Keep them short. If the consequences section has no cost in it, the decision probably
wasn't hard enough to need a record.

## Changing one

**ADRs are append-only.** Never rewrite a record to match a new decision — that erases the
reasoning chain, which is the only thing the file was for.

To change course: write a new ADR, reference the old one, and edit the old one's status to
`Superseded by ADR NNNN`. That one status line is the only permitted edit.

Statuses: `Proposed`, `Accepted`, `Superseded by ADR NNNN`, `Deprecated`.
