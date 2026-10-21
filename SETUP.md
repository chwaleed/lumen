# Setup

Run these in order on a fresh machine. Stop at the end of Stage 2 if you only need
the editor; Stage 3 is what makes the **Compile** button work.

`README.md` shows the short version. This file is the one that does not leave
anything out.

## Prerequisites

| Tool | Version used here | Check |
|---|---|---|
| Docker Engine + Compose v2 | 29.8.0 | `docker version` |
| Bun | 1.4.2 (pinned in `package.json`) | `bun --version` |
| Python | 3.12+ | `python3 --version` |
| Disk | ~10 GB free | the TeX image alone is ~8 GB |

Python is only needed for Stage 3. The API itself runs in Docker.

---

## Stage 1 — Configuration

Compose declares `env_file: ./.env`, so **without this step every later command
fails immediately.** There is no default.

```bash
cp .env.example .env
```

Now open `.env` and set:

- **`JWT_SECRET_KEY`** — at least 32 characters. Anything will boot, but every
  session token is signed with it, so do not ship the placeholder.
- **`POSTGRES_PASSWORD`** — any value. It is used to create the database on first
  run, so changing it later means deleting the `postgres-data` volume.
- **`AWS_ACCESS_KEY_ID`** / **`AWS_SECRET_ACCESS_KEY`** — needed for figure and
  image uploads. See *Without AWS credentials* below for what breaks if you skip
  these.

Leave everything else alone, with one host-specific exception noted under
*Snap-installed Docker*.

Never commit `.env`. It is gitignored; keep placeholders in `.env.example`.

---

## Stage 2 — Database, API and frontend

```bash
docker compose up -d
```

That brings up three containers and runs the Alembic migrations automatically at
API startup. Never create tables by hand.

- API — <http://localhost:9000>, docs at <http://localhost:9000/docs>
- Adminer — <http://localhost:8080> (server `postgres`)

Confirm it came up before moving on:

```bash
docker compose ps                  # all three services 'running'
curl -s localhost:9000/docs -o /dev/null -w '%{http_code}\n'   # expect 200
```

Then the frontend, **on the host, with bun**:

```bash
cd frontend
bun install
bun dev
```

Open <http://localhost:3000>, sign up, and you land in the dashboard.

- **Use bun, not npm.** `bun.lock` is the only lockfile and the Dockerfile builds
  on `oven/bun`. Running `npm install` here creates a competing
  `package-lock.json`.
- The frontend needs no `.env`. Server-side calls default to
  `http://localhost:9000` (`frontend/lib/auth/backend.ts`), and browser code only
  ever uses relative paths.

At this point you can write, save, browse the file tree and use templates.
**Compile will spin forever** — nothing is draining the queue yet.

---

## Stage 3 — Compilation

Two things are missing: the TeX image, and the worker that consumes compile jobs.

The worker is **not** in compose. It shells out to `compile/compile.sh`, which
runs `docker run` directly, so it needs the Docker daemon and a work directory
whose path means the same thing to the daemon as it does to the worker. Running it
on the host is what keeps those two facts true.

### 3a. Build the TeX image — once, ~8 GB

```bash
cd compile
docker build -t lumen-tex:latest .
./verify.sh
```

`verify.sh` is the sandbox regression suite. Run it after this build and after
every TeX Live upgrade. Some of its checks are expected to fail by design and are
labelled as such; what matters is that the preflight passes, because a check that
"passes" against a document that never compiled is worse than no check.

If the preflight reports that the work directory is not visible inside the
container, see *Snap-installed Docker* below.

### 3b. Install the worker's Python dependencies on the host

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

A virtualenv is optional but keeps these out of your system Python.

### 3c. Point the worker at the API's database

This is the step people miss. **Compose does not publish Postgres** — there is no
`ports:` entry on that service. So from the host:

- `postgres:5432` does not resolve, and
- `localhost:5432` is a *different server* if your machine already runs its own
  Postgres.

The worker and the API must share one database, or the worker will sit idle while
jobs queue up in a database it cannot see. Read the container's address directly:

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' lumen-postgres
```

Then build the connection string from it, substituting the `POSTGRES_USER`,
`POSTGRES_PASSWORD` and `POSTGRES_DB` you set in Stage 1:

```bash
export POSTGRES_CONNECTION_STRING="postgresql://postgres:YOUR_PASSWORD@172.x.x.x:5432/lumen"
```

The IP changes when the container is recreated, so re-read it after a
`docker compose down`.

### 3d. Run the worker

```bash
cd backend
python -m src.compiles.worker
```

Leave it running in its own terminal. Hit **Compile** in the UI; the first build
of a project takes roughly 36 seconds and warm rebuilds about 7, because the
`.aux` and `.fdb_latexmk` files survive between compiles in a per-project work
directory under `backend/.compile/work/`.

---

## Verifying the whole thing

```bash
cd backend && pytest                 # backend suite; pytest is NOT in requirements.txt
cd frontend && bun run test:unit     # logic
cd frontend && bun run test:e2e:local # browser flows needing no API
cd frontend && bun run test          # everything
```

Install pytest globally or into the venv yourself. Read
`frontend/tests/README.md` before adding frontend tests; it defines the folder
layout, the `@backend` tag and the screenshot-as-proof rule.

---

## Host-specific notes

### Snap-installed Docker

This is the setup on the primary development host (`/snap/bin/docker`). Two things
about it bite:

- **`/tmp` bind mounts arrive empty inside containers.** Anything that stages
  files under `/tmp` and mounts them will see an empty directory. Run `verify.sh`
  with `TMPDIR="$HOME" ./verify.sh`, and keep compile work directories under the
  repo rather than `/tmp`.
- **`docker compose exec` fails** when `--security-opt=no-new-privileges` is set.
  Set `COMPILE_SECURITY_OPT=` (empty) in `.env` for local work on such a host, and
  only there. It is required in production.

Use the `docker inspect` command in 3c rather than `docker compose exec backend
printenv` for the same reason.

### Without AWS credentials

`boto3` talks to real AWS; there is no local S3 substitute in `requirements.txt`.
With `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` unset:

- the `/uploads` routes return 500,
- figures and images cannot be added to a project, and
- compiling a project that already references a figure fails, because the worker
  cannot fetch the asset.

Editing and compiling text-only documents work fine.

---

## Changing things later

| Change | Command |
|---|---|
| `requirements.txt` edited | `docker compose up -d --build backend` |
| Database schema | add an Alembic revision under `backend/alembic/versions/`; `init_db` applies it at startup |
| Start over completely | `docker compose down -v` (this deletes the database) |

Never develop against the SQLite fallback in `backend/src/core/config.py`.
Production is Postgres and the two schemas drift.
