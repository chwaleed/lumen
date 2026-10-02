# Deployment

## Current state

**There is no deployment.** `.github/workflows/deploy.yml` is commented out in full,
pending a server. The header in that file explains how to re-enable it and which secrets it
needs.

Nothing is automated today — including the tests.

## How it is designed to work

```
push to main
   └─► build backend image      ─┐
       build frontend image      ├─► push both to Docker Hub
                                 ┘
   └─► ssh to server
         docker compose -f docker-compose.prod.yml pull
         docker compose -f docker-compose.prod.yml up -d --remove-orphans
```

### Required secrets

| Secret | Used for |
|---|---|
| `DOCKERHUB_USERNAME` | Image namespace, and the `DOCKERHUB_USERNAME` env in prod compose |
| `DOCKERHUB_TOKEN` | Registry push |
| SSH host / user / key | The deploy step |

### Production compose differs from local

| | Local (`docker-compose.yml`) | Production (`docker-compose.prod.yml`) |
|---|---|---|
| Backend | Built from source, mounted, `--reload` | Prebuilt image |
| Frontend | Not included — runs on the host | Included, port published |
| Backend port | Published on 9000 | **Not published** — reachable only over the compose network |
| Postgres | Defaults for user/password | Requires them from `.env` |

The unpublished backend port is a security control, not an oversight (NFR-S7): only the
Next server talks to the API.

## Before the first public deployment

In order of importance:

1. **Enable `Secure` cookies.** `shouldUseSecureCookies` in `lib/auth/cookies.ts` returns
   `false` unconditionally, with the protocol-based implementation commented beneath it.
   This is a deliberate temporary measure (SRS C-2, NFR-S5) and must be reversed.
   `frontend/tests/unit/auth/cookies.test.ts` pins the current behaviour, so the change will
   fail a test on purpose — update it in the same commit.
2. **Terminate TLS** in front of the Next server. Nothing in the compose files does this; it
   needs a reverse proxy or a platform that provides it.
3. **Set real secrets.** `JWT_SECRET_KEY` at 32+ characters and a strong
   `POSTGRES_PASSWORD`. Rotating the JWT secret invalidates every session.
4. **Run the tests in CI** before the deploy job, so a broken build cannot ship.
5. **Add rate limiting** to the auth endpoints (NFR-S9).
6. **Arrange database backups.** The `postgres-data` volume is the only copy of everything.

## Migrations

No deploy step. `init_db` runs `alembic upgrade head` during application startup, so a new
container migrates before serving traffic
([ADR 0002](../decisions/0002-run-migrations-at-application-startup.md)).

The consequence to remember: **this races if several instances start at once.** Fine at one
instance; running more needs a migration lock or a separate migration step.

## Rollback

Re-deploy the previous image tag. **Migrations do not roll back automatically** — Alembic
downgrades exist but are not run by any deploy step, so a release containing a destructive
migration cannot be rolled back by image alone. Check for schema changes before rolling
back, and prefer additive migrations for exactly this reason.
