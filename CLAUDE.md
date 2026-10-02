# Lumen

LaTeX editor. FastAPI backend (`backend/`), Next.js 16 frontend (`frontend/`), Postgres 16.

## Commit discipline

**Commit after every few changes, not at the end of a session.** Every change must be
traceable to a small commit that explains why it happened.

- One logical change per commit. If the subject line needs an "and", split it.
- Commit as soon as a change is coherent and not broken — don't batch unrelated work.
- Subject: imperative, under ~72 chars. Body: why, not what the diff already shows.
- **Never add `Co-Authored-By` trailers, "Generated with Claude Code" lines, or any
  other AI attribution to commits or PR bodies.**

## Running locally

Docker for Postgres + backend, host for the frontend.

```bash
cp .env.example .env          # set JWT_SECRET_KEY, POSTGRES_PASSWORD, AWS keys
docker compose up -d          # API :9000, adminer :8080 — migrations auto-run on startup
cd frontend && npm install && npm run dev    # :3000
```

- `requirements.txt` changed → `docker compose up -d --build backend`.
- Backend tests: `cd backend && pytest` (pytest is not in `requirements.txt`; install it globally).
- Never develop against the sqlite fallback in `src/core/config.py` — prod is Postgres and the schemas drift.

## Backend

- One package per domain under `src/`: `models.py`, `schemas.py`, `router.py`, `service.py`.
  Routers stay thin — validation and DB work live in `service.py`.
  (`src/auth/scheema.py` is a legacy typo; new modules use `schemas.py`.)
- Schema changes need an Alembic revision in `backend/alembic/versions/`. `init_db` runs
  migrations at startup, so never create tables directly.
- All config goes through `Settings` in `src/core/config.py` — no bare `os.getenv` reads
  outside the `__main__` entrypoint.
- Responses go through `ApiResponseBuilder`, so every endpoint returns `{success, message, data}`.

## Frontend

See `frontend/AGENTS.md` first — this is Next.js 16 and its APIs differ from older versions.

- Shared components in `components/`, page-specific in `app/<route>/components/`,
  page state in `app/<route>/use-<route>-hook.ts`.
- Filenames are lowercase kebab-case. Split large components into a folder with a
  main file named after it.
- Colors come only from semantic tokens in `app/globals.css` (`bg-primary/10`,
  `text-foreground`, `border-border`) — never raw Tailwind palette values.
- Server-side calls to the API use `lib/auth/backend.ts` / `lib/http/client.ts`.
  Client code uses relative paths; the browser never talks to port 9000 directly.

Skills in `.claude/skills/` cover the component, shadcn, and Zustand conventions in depth.

## Don't commit

`.env`, `*.db`, build output. Secrets belong in `.env` only, with placeholders in `.env.example`.
