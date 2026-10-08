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
cd frontend && bun install && bun dev        # :3000
```

- **The frontend uses bun, not npm.** `bun.lock` is the only lockfile and the
  Dockerfile builds on `oven/bun`. Never run `npm install` here — it creates a
  competing `package-lock.json`.
- `requirements.txt` changed → `docker compose up -d --build backend`.
- Backend tests: `cd backend && pytest` (pytest is not in `requirements.txt`; install it globally).

### Compiling locally

`docker compose up -d` does **not** give you working compilation. The queue fills and
nothing drains it, so Compile spins forever in the UI. The worker runs on the host
because it drives the Docker daemon directly — it is not in compose, which would mean
mounting the socket into a container and keeping its bind-mount paths identical to the
host's.

```bash
cd compile && docker build -t lumen-tex:latest . && ./verify.sh   # ~8GB, once
cd backend && python -m src.compiles.worker                       # leave it running
```

The worker and the API must share one database. Compose does not publish Postgres, and
on a host that already runs its own Postgres `localhost:5432` is a *different* server —
point `POSTGRES_CONNECTION_STRING` at the container (`docker compose exec backend
printenv POSTGRES_CONNECTION_STRING`, then swap the host for the container's IP).

## Testing

Frontend uses **`bun test`** for logic and **Playwright** for flows. A feature owns a
folder of the same name in both trees — `tests/unit/<feature>/` and `tests/e2e/<feature>/` —
so adding a feature never means editing config. Read `frontend/tests/README.md` before
adding tests; it defines the layout, the `@backend` tag, and the screenshot-as-proof rule.

```bash
cd frontend
bun run test            # full pipeline
bun run test:unit       # logic only
bun run test:e2e:local  # browser flows that need no API
bun test auth           # one feature
```

E2E specs take named screenshots via the `proof` fixture, landing in
`tests/artifacts/screenshots/<feature>/<spec>/<test>/`. Everything under
`frontend/tests/artifacts/` is gitignored.
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

This is **Next.js 16** — APIs, conventions, and file structure differ from older versions.
Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing code, and
heed deprecation notices. (`frontend/AGENTS.md` says the same; Next generates that file, so
don't hand-edit it.)

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
