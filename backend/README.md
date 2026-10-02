# Lumen backend

FastAPI service behind the Lumen editor. SQLModel over PostgreSQL 16, Alembic for schema,
JWT auth, S3 presigned URLs for image uploads.

See the [root README](../README.md) for the whole system; this covers the backend alone.

## Running

Normally you run it through Compose from the repo root — source is mounted and uvicorn
reloads, so editing `src/` takes effect immediately:

```bash
docker compose up -d                      # API :9000
docker compose logs -f backend
docker compose up -d --build backend      # after changing requirements.txt
```

Interactive API docs: <http://localhost:9000/docs>.

To run it directly on the host instead:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m uvicorn src.main:app --reload --port 9000
```

Without `POSTGRES_CONNECTION_STRING` set, `src/core/config.py` falls back to a local
SQLite file. That is fine for a quick poke at an endpoint, but **do not develop against
it** — production is Postgres and the two disagree on types and `ALTER` behaviour.

## Layout

One package per domain, each with the same four files:

| File | Holds |
|---|---|
| `models.py` | SQLModel tables |
| `schemas.py` | Pydantic request/response models |
| `router.py` | Endpoints — thin; no business logic |
| `service.py` | Validation, authorisation and database work |

```
src/
  auth/            signup, login, refresh, logout, password and token helpers
  projects/        project CRUD, template seeding
  file_entries/    the file tree: create, rename, move, delete
  file_snapshots/  versioned file content
  uploads/         S3 presigned upload URLs
  shared/          project ownership checks used by every project route
  core/            settings, API envelope, security, Sentry/observability
  db/              engine cache, session dependency, migration runner
  main.py          app factory, routers, exception handlers
```

`src/auth/scheema.py` is a legacy misspelling; new modules use `schemas.py`.

## API

Everything returns the same envelope, built by `ApiResponseBuilder`:

```json
{ "success": true, "message": "Project created successfully.", "data": { } }
```

| Method | Path | |
|---|---|---|
| POST | `/auth/signup` | creates the user and establishes a session |
| POST | `/auth/login` | returns an access/refresh pair |
| POST | `/auth/refresh` | exchanges a refresh token |
| POST | `/auth/logout` | revokes the refresh token |
| GET | `/projects` | the caller's projects |
| POST | `/projects` | creates one, seeded from a template |
| GET | `/projects/{id}` | project detail with its file tree |
| PATCH | `/projects/{id}` | rename |
| POST | `/projects/{id}/files` | create a file or folder |
| PATCH | `/projects/{id}/files/{entry_id}` | rename or move |
| DELETE | `/projects/{id}/files/{entry_id}` | delete, with its whole subtree |
| POST | `/projects/{id}/files/{entry_id}/snapshots` | save new content |
| POST | `/uploads/presigned-url` | a signed S3 PUT for an image |

Authentication is a bearer access token. Refresh tokens are stored hashed
(`refresh_tokens.token_hash`) and carry a `jti` so a single session can be revoked.

### Ownership returns 404, not 403

`get_project_for_user` filters on `user_id` and raises **404** when a project belongs to
someone else — deliberately, so project ids cannot be probed for existence. Every project
route goes through it. Keep new routes on that path rather than re-querying `Project`.

### Templates

`POST /projects` accepts `template_id`: `blank` (the default), `academic`, `math`,
`presentation`, `resume`, `letter`. Each seeds `main.tex`; `academic` also seeds
`references.bib`.

## Database and migrations

Tables: `users`, `refresh_tokens`, `projects`, `file_entries`, `file_snapshots`.
`file_entries` is self-referencing via `parent_id` — that is the file tree.

**Migrations run automatically at app startup** (`init_db` in `src/db/session.py`), so
there is no deploy step to remember and no `create_all` anywhere. Any schema change needs
a revision:

```bash
.venv/bin/python -m alembic revision --autogenerate -m "add thing"
.venv/bin/python -m alembic upgrade head      # or just restart the app
.venv/bin/python -m alembic downgrade -1
```

Inspect the data at <http://localhost:8080> (Adminer, server `postgres`).

## Configuration

`Settings` in `src/core/config.py` is the only way config enters the app — no bare
`os.getenv` outside the `__main__` entrypoint. It reads `backend/.env` then the repo root
`.env`. `S3_BUCKET_NAME` and `S3_REGION` have no defaults, so the app will not start
without them. See the root README for the full table.

## Tests

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest                     # 98 tests
.venv/bin/python -m pytest tests/unit          # fast layer
.venv/bin/python -m pytest tests/unit/uploads  # one feature
```

`tests/unit/<feature>/` mirrors `src/`; `tests/api/<feature>/` drives real HTTP through
`TestClient`. Each test gets its own throwaway SQLite database. `pytest` is a dev
dependency only — it is deliberately absent from `requirements.txt` and the image.

Full conventions, fixtures and known gaps: [`tests/README.md`](tests/README.md).
