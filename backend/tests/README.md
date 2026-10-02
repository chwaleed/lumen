# Backend tests

Same standard as the frontend: **a feature owns a folder of the same name in both trees.**

```
tests/
  conftest.py              shared fixtures (see below)
  unit/<feature>/          services and helpers called directly, no HTTP
    auth/test_utils.py
    file_entries/test_service.py
    file_snapshots/test_service.py
    projects/test_schema.py
    shared/test_project_access.py
    uploads/test_service.py
    core/test_observability.py
    db/test_migrations.py
  api/<feature>/           full request/response through TestClient
    auth/test_auth_api.py
    file_entries/test_file_entries_api.py
    projects/test_projects_api.py
    uploads/test_uploads_api.py
```

`unit/` mirrors `src/` one-for-one. Adding a feature means adding a folder in each tree —
no config edits, pytest discovers by convention.

## Setup

`pytest` is a dev dependency, not a runtime one, so it lives in `requirements-dev.txt`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

## Running

```bash
.venv/bin/python -m pytest                       # everything
.venv/bin/python -m pytest tests/unit            # fast layer only
.venv/bin/python -m pytest tests/api             # HTTP layer only
.venv/bin/python -m pytest tests/unit/uploads    # one feature
.venv/bin/python -m pytest -k "descendant"       # one behaviour
```

`pytest.ini` sets `pythonpath = .` so tests import `src.*` directly, and
`--import-mode=importlib` so several features can each own a `test_service.py`
without needing `__init__.py` files.

## Fixtures

All in `conftest.py`. Each test gets its **own** SQLite database under `tmp_path`, so tests
never share state and can run in any order.

| Fixture | Gives you |
|---|---|
| `database_url` | an isolated SQLite URL, engine disposed afterwards |
| `settings` | `Settings` pointed at it, with Sentry and S3 neutralised |
| `migrated_settings` | the same, with the full migration history applied |
| `session` | a `Session` against a migrated database — for `unit/` tests |
| `client` | a `TestClient`; app startup runs migrations — for `api/` tests |
| `auth_headers` | a registered user's `Authorization` header |

`register(client, email=...)` creates an additional user when a test needs a second
identity — most often to prove one user cannot reach another's data.

## Conventions

- **Test the boundary, not the implementation.** Ownership checks return `404`, not `403`,
  so project ids cannot be probed for existence; assert the `404`.
- **Group related cases in a `Test*` class** when a module has several behaviours
  (`TestCreate`, `TestUpdate`, `TestDelete`). Keep standalone functions for one-offs.
- **Use `fail_as(status)`** (in `unit/file_entries/test_service.py`) rather than repeating
  `pytest.raises` plus a status assertion. It is a thin `contextmanager` over `pytest.raises`.
- **Comment the why, not the what**, and only where a reader would otherwise ask —
  e.g. why moving a folder into its own child must fail.
- **AWS never gets called.** `uploads` tests run under `moto`'s `@mock_aws` with fake
  credentials pinned by an `aws_credentials` fixture.

## Known gap

Everything runs on SQLite while production is Postgres 16. One migration
(`0524db2320ab`) uses `batch_alter_table`, which exists because SQLite cannot `ALTER` —
exactly the case most likely to diverge. The fixtures already take the URL from an env
var, so pointing CI at Postgres is the remaining work.
