# ADR 0002: Run migrations at application startup

**Status:** Accepted

## Context

The schema is owned by Alembic. Applying migrations as a separate deploy step means a
window where new code runs against an old schema if the step is forgotten, skipped, or
ordered wrongly.

## Decision

`init_db` runs `alembic upgrade head` during the FastAPI lifespan, before the app serves
traffic. Nothing calls `create_all`.

## Consequences

- A deploy cannot serve traffic against a stale schema (NFR-R2), and there is no separate
  step to remember.
- Container start is slower by the cost of the migration check.
- **Multiple instances starting together would race.** Fine at one instance; running
  several requires either a migration lock or moving this back to a deploy step. Revisit
  before scaling horizontally.
- Tests get this free: every fixture database is migrated the same way production is, so
  migrations are exercised constantly rather than only at deploy.
