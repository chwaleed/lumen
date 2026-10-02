# Testing strategy

Why the tests are shaped the way they are. For *how to run and write* them, see
[`backend/tests/README.md`](../../backend/tests/README.md) and
[`frontend/tests/README.md`](../../frontend/tests/README.md).

## Shape

243 tests across three layers.

| Layer | Count | Runner | Covers |
|---|---|---|---|
| Backend unit | ~70 | pytest | Services and helpers called directly, no HTTP |
| Backend API | ~28 | pytest + TestClient | Real request/response through the app |
| Frontend unit | 121 | bun test | Pure logic, Zustand stores, the HTTP client |
| Frontend e2e | 24 | Playwright | User flows in a real browser |

Every feature owns a folder of the same name in every tree
([ADR 0004](../decisions/0004-feature-folders-for-tests.md)), so any feature can be tested
alone and adding one never means editing test config.

## What gets tested, and what does not

**Heavily tested** — anything where being wrong is expensive and the failure is quiet:

- Authorisation. `get_project_for_user` is the only boundary protecting one user's data
  from another, so it is tested directly *and* through every route that depends on it.
- Tree manipulation. The folder-into-descendant guards would silently orphan rows.
- Token handling. Hashing, rotation, and the distinction between expired and invalid.
- Upload input. Path traversal in filenames, content-type restriction.
- The HTTP client envelope. One function's behaviour reaches every screen.

**Deliberately not tested:**

- Presentational components that only compose shadcn primitives — testing them mostly tests
  shadcn.
- `cn()`, a one-line wrapper over two libraries.
- `async` Server Components, which cannot be rendered by a unit runner. Next's own
  documentation recommends e2e for these, which is what we do.

The gap this leaves: React hooks needing a DOM (`use-panel-sizing`, `use-editor-selection`)
are covered only indirectly, through e2e. Adding real component tests is the trigger to move
the frontend unit layer from `bun test` to Vitest — not to run both.

## The `@backend` tag

Most e2e specs exercise routing, rendering and client-side validation, needing no API. Those
that genuinely require one carry `@backend` in the title, so `bun run test:e2e:local`
excludes them and the offline loop stays fast.

The tag has to mean something. An early version of the login rejection test asserted merely
that *an* error appeared — which passed with the backend down, since a network failure also
produces an error. It now asserts the backend's own wording, so it fails when the API is
absent instead of passing for the wrong reason. **A `@backend` test that passes without a
backend is a broken test.**

## Isolation

Every backend test gets its own SQLite database under `tmp_path`, so tests share no state
and can run in any order.

Frontend stores are module singletons, so each test file captures `getState()` once and
restores it in `beforeEach`.

Network mocking happens at the **outermost boundary only** — axios, never our own modules.
`mock.module` is process-global in bun and every test file shares one module registry, so a
file mocking `@/lib/http/client` broke the tests for that very module once the suite ran
together. The single mock lives in `tests/unit/support/axios-mock.ts` and is listed under
`preload` in `bunfig.toml`, because `lib/http/client.ts` calls `axios.create()` at module
scope and whichever importer arrives first captures it.

## Proving a test works

A test that has never failed has not been shown to detect anything. Where a test exists to
pin a specific bug, the fix is verified by restoring the old behaviour and confirming the
test fails — the two bugs in
[ADR 0006](../decisions/0006-report-missing-api-messages-as-null.md) were confirmed this
way, with seven tests failing against the old logic.

## E2E screenshots

Specs capture named screenshots at points worth reviewing, so a passing run leaves a visual
record rather than a green tick
([ADR 0005](../decisions/0005-screenshots-as-e2e-proof.md)).

## Known gaps

1. **Nothing runs automatically.** The deploy workflow is commented out pending a server,
   so all 243 tests are run by hand. This is the largest gap — tests nobody runs decay.
2. **SQLite, not Postgres.** Every backend test runs on SQLite while production is
   Postgres 16, and one migration uses `batch_alter_table` precisely because SQLite cannot
   `ALTER`. The fixtures already take the URL from an environment variable, so pointing CI
   at a Postgres service is small work.
3. **No coverage measurement.** Deliberate: coverage on a suite nobody runs is a vanity
   metric. Worth adding once CI exists.
4. **One browser.** E2E runs Chromium only.
