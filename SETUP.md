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
**Leave everything else alone**, including the S3 block. You do not need an AWS
account: compose runs an S3-compatible service locally and `.env.example` already
points at it. See *Object storage* below.

One host-specific exception is noted under *Snap-installed Docker*.

Never commit `.env`. It is gitignored; keep placeholders in `.env.example`.

---

## Stage 2 — Database, API and frontend

```bash
docker compose up -d
```

That brings up Postgres, object storage, the API and Adminer, and runs the Alembic
migrations automatically at API startup. Never create tables by hand.

- API — <http://localhost:9000>, docs at <http://localhost:9000/docs>
- Adminer — <http://localhost:8080> (server `postgres`)
- Object storage — <http://localhost:9100>

`lumen-s3-init` creates the bucket and then exits, so **`Exited (0)` is the
correct state for it** and not a failure. The API waits for it.

Confirm things came up before moving on:

```bash
docker compose ps                  # s3-init exited 0, the rest 'running'
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

The backend container already has these, but that does not help here: the worker is
a **separate host process**, not that container, and host Python cannot import from
a container's `site-packages`. Skip this and the worker dies on
`ModuleNotFoundError: No module named 'sqlmodel'`.

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt     # runtime deps, plus pytest and moto
```

A virtualenv is optional but keeps these out of your system Python. If
`backend/.venv` already exists, this step has been done; just activate it.

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

The worker also reads figures back out of object storage, and `.env` points at
`http://s3`, a name that only resolves inside the compose network. From the host
it has to use the published port instead, or every compile of a project with a
figure fails:

```bash
export S3_ENDPOINT_URL=http://localhost:9100
```

Credentials need no override; `Settings` reads those from `.env`.

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
cd backend && pytest                  # backend suite (needs requirements-dev.txt)
cd frontend && bun run test:unit      # logic
cd frontend && bun run test:e2e:local # browser flows needing no API
cd frontend && bun run test           # everything
```

Read `backend/tests/README.md` and `frontend/tests/README.md` before adding tests;
they define the folder layout, the `@backend` tag and the screenshot-as-proof rule.

---

## Troubleshooting

### Compile says "Could not start the compile", and images will not load

If both break at once, suspect the **frontend dev server**, not storage. The
symptom is that every proxy route nested below `[id]` returns a 404 HTML page
while the shallower ones still answer JSON:

```bash
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://localhost:3000/api/projects/1
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' -X POST http://localhost:3000/api/projects/1/compile
```

A `404 text/html` on the second with a `200 application/json` on the first means
the dev server's route table is stale, which has happened after a Next version
change. The 404 is HTML, so the client reads no `message` field and falls back to
its generic wording -- which is why the error names neither the route nor the
status. Confirm the backend is fine first, then rebuild the route table:

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:9000/docs   # 200 = backend fine
# then, in the frontend terminal: Ctrl-C
rm -rf frontend/.next && cd frontend && bun dev
```

Check for a leftover `next-server` on an older version at the same time
(`ps -eo pid,etime,cmd | grep next-server`); one lingered through a downgrade here.

### Compile spins forever

Nothing is draining the queue. The worker is not part of compose -- see Stage 3.
Confirm with `ps -eo pid,cmd | grep compiles.worker`, and check for rows stuck in
`queued`:

```bash
docker exec lumen-postgres psql -U postgres -d lumen -c \
  "SELECT id, status FROM compile_jobs ORDER BY id DESC LIMIT 5;"
```

### "could not be stored. File storage is unavailable."

boto3 has no credentials, or the endpoint points at something that is not
running. Both endpoint variables and the placeholder keys must be set as
`.env.example` has them; see *Object storage*. A stale `AWS_ENDPOINT_URL_S3` left
in `.env` from an older local setup will also cause this, and it overrides
nothing visible in the error.

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

## Object storage

Figures, and every other uploaded binary, live in S3 rather than the database.
Local development does not use AWS for this: compose runs **s3proxy**, an
S3-compatible service that keeps objects in the `s3-data` volume. The credentials
in `.env.example` are placeholders it ignores, and they cannot be blank only
because boto3 refuses to sign a request without something there.

Two endpoints describe one service, and they are not interchangeable:

| Setting | Value | Who uses it |
|---|---|---|
| `S3_ENDPOINT_URL` | `http://s3` | the API, over the compose network |
| `S3_PUBLIC_ENDPOINT_URL` | `http://localhost:9100` | the browser, and what URLs are signed with |

A presigned URL signs its own `Host` header, so an upload URL signed with the
internal name fails in the browser with `SignatureDoesNotMatch`. The compile
worker is a third case: it runs on the host, so it needs
`S3_ENDPOINT_URL=http://localhost:9100` as described in stage 3c.

**Authorization is disabled** on the local service. That is deliberate: the editor
loads a figure straight from its stored URL with no signature, exactly as a
public-read bucket behaves in production. The cost is that a presigned URL is
accepted here no matter how it was signed, so a signing bug will not show up
locally. Do not run this configuration anywhere but a development machine.

### Pointing at real AWS instead

Put real keys in `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, and **set both
endpoint variables to empty**. Empty means real AWS; leaving them set sends signed
requests to a service that is not there. With both unset and no keys, boto3 falls
back to its usual chain, which is how a deployment on an instance role works.

---

## Changing things later

| Change | Command |
|---|---|
| `requirements.txt` edited | `docker compose up -d --build backend` |
| Database schema | add an Alembic revision under `backend/alembic/versions/`; `init_db` applies it at startup |
| Start over completely | `docker compose down -v` (this deletes the database) |

Never develop against the SQLite fallback in `backend/src/core/config.py`.
Production is Postgres and the two schemas drift.
