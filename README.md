# Lumen

A collaborative LaTeX editor. Write papers in the browser with a Monaco editor, a live
preview, a project file tree, and an AI assistant panel.

| | |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind 4, shadcn/ui, Zustand, Monaco — [`frontend/`](frontend/README.md) |
| **Backend** | FastAPI, SQLModel, Alembic, PyJWT, boto3 — [`backend/`](backend/README.md) |
| **Database** | PostgreSQL 16 |
| **Storage** | S3 (image uploads via presigned URLs) |

## Quickstart

Docker runs Postgres and the API; the frontend runs on the host.

```bash
cp .env.example .env     # set JWT_SECRET_KEY, POSTGRES_PASSWORD, AWS keys
docker compose up -d     # API :9000, adminer :8080 — migrations run on startup

cd frontend
bun install
bun dev                  # :3000
```

Then open <http://localhost:3000>. Sign up and you land straight in the dashboard.

- **The frontend uses bun, not npm.** `bun.lock` is the only lockfile and the Dockerfile
  builds on `oven/bun`.
- Changed `requirements.txt`? `docker compose up -d --build backend`.
- API docs are served at <http://localhost:9000/docs>.
- Adminer at <http://localhost:8080> (server `postgres`) for a look at the database.

## Layout

```
backend/           FastAPI service — one package per domain under src/
  alembic/         migration history; runs automatically at app startup
  src/
    auth/          signup, login, refresh, logout, JWT handling
    projects/      project CRUD and template seeding
    file_entries/  the project file tree (files and folders)
    file_snapshots/ versioned file content
    uploads/       S3 presigned upload URLs
    shared/        project ownership checks shared across routers
    core/          settings, API envelope, observability, security
    db/            engine, session and migration wiring
  tests/           see backend/tests/README.md

frontend/          Next.js app
  app/
    (marketing)/   public landing page
    (dashboard)/   dashboard, projects, templates
    project/[id]/  the editor workspace
    login, signup
    api/           route handlers proxying the backend, owning the session cookies
  components/      shared UI; components/ui is shadcn
  lib/             auth, http client, stores, project tree builders
  tests/           see frontend/tests/README.md

docker-compose.yml       local: builds the backend, mounts source, hot reload
docker-compose.prod.yml  deploy: prebuilt images, frontend included
```

## How a request flows

The browser never talks to the API directly. It calls a Next route handler under
`app/api/`, which forwards to FastAPI and owns the httpOnly session cookies. `proxy.ts`
guards the protected routes and refreshes an expired access token before the page renders.

```
browser ──► Next route handler ──► FastAPI ──► Postgres
            (sets/reads cookies)   (Bearer token)
```

Every API response uses the same envelope, so clients branch on one shape:

```json
{ "success": true, "message": "Project created successfully.", "data": { } }
```

## Testing

Both halves follow the same rule: **a feature owns a folder of the same name in every test
tree**, so adding a feature never means editing test config.

```bash
cd backend  && .venv/bin/python -m pytest      # 98 tests
cd frontend && bun run test                    # 121 unit + 24 e2e
cd frontend && bun run test:e2e:local          # e2e subset needing no backend
```

E2E specs capture named screenshots as proof of each flow, under
`frontend/tests/artifacts/screenshots/<feature>/`. Details in
[`backend/tests/README.md`](backend/tests/README.md) and
[`frontend/tests/README.md`](frontend/tests/README.md).

## Configuration

All of it lives in `.env` at the repo root, read by both Docker Compose and the backend.
Copy `.env.example` and fill in the blanks.

| Variable | Notes |
|---|---|
| `JWT_SECRET_KEY` | 32+ characters. Rotating it invalidates every session. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Default 15 minutes / 7 days. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Compose builds the connection string from these. |
| `POSTGRES_CONNECTION_STRING` | Overrides the above when set. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Without these the upload routes fail; everything else works. |
| `S3_BUCKET_NAME` / `S3_REGION` | Required — the backend will not start without them. |
| `BACKEND_URL` | Only when running the frontend outside Docker. Defaults to `http://localhost:9000`. |
| `SENTRY_DSN` | Leave empty to disable error reporting. |

## Deploying

`.github/workflows/deploy.yml` builds and pushes both images to Docker Hub, then runs
`docker-compose.prod.yml` on the server. That compose file pulls prebuilt images and
includes the frontend; the backend port is not published, since only the Next server
talks to it.

**CI does not run the tests yet.** Adding that, and pointing the backend suite at Postgres
instead of SQLite, is the main outstanding gap.

## Conventions

`CLAUDE.md` holds the working standards — commit discipline, backend module layout,
frontend component and styling rules. Worth a read before your first change.
