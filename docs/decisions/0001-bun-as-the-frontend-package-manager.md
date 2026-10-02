# ADR 0001: bun as the frontend package manager

**Status:** Accepted

## Context

The frontend had both `bun.lock` and `package-lock.json` committed, no `packageManager`
field, and a Dockerfile building on `oven/bun`. Tooling and contributors had to guess, and
running the wrong installer produced a second lockfile that then drifted from the first.

## Decision

bun is the frontend package manager. `bun.lock` is the only lockfile, `package-lock.json`
is deleted, and `package.json` pins `"packageManager": "bun@1.4.2"`.

## Consequences

- One lockfile, matching what the Dockerfile already built with.
- The pin also resolves package-runner ambiguity for tooling that reads `packageManager`
  (the shadcn CLI picks `bunx` rather than guessing).
- Contributors need bun installed; `npm install` here is now a mistake that recreates the
  competing lockfile. Called out in the frontend README and `CLAUDE.md`.
- The backend is unaffected — it has its own toolchain.
