# Frontend tests

Two layers, two runners, one rule: **a feature owns a folder of the same name in both trees.**

```
tests/
  unit/                     bun test  — pure logic, no browser, milliseconds
    auth/
      jwt.test.ts
    editor/
      file-tree-utils.test.ts
  e2e/                      Playwright — real browser, real routes
    support/
      test-base.ts          shared fixtures (the `proof` screenshot helper)
    auth/
      login.spec.ts
    marketing/
      landing.spec.ts
  artifacts/                gitignored — every output of a run
    screenshots/<feature>/<spec>/<test>/01-step.png
    test-results/           failure screenshots, traces
    report/                 HTML report
```

Adding a feature means adding `tests/unit/<feature>/` and `tests/e2e/<feature>/`. Nothing
else changes — no config edits, no registration. Both runners discover by glob.

## Naming

| Layer | Suffix | Why |
|---|---|---|
| unit | `*.test.ts` | what `bun test` collects |
| e2e | `*.spec.ts` | what Playwright collects |

The suffixes differ on purpose: bun's default glob also matches `*.spec.ts`, so
`bunfig.toml` pins `root = "tests/unit"` and the naming keeps the split obvious even
if that pin is ever lost.

## Running

```bash
bun run test               # full pipeline: unit, then e2e
bun run test:unit          # all unit tests
bun run test:e2e           # all e2e tests (needs the backend, see @backend)
bun run test:e2e:local     # e2e minus anything needing the backend
bun run test:e2e:ui        # Playwright's watch/debug UI
bun run test:e2e:report    # open the HTML report from the last run
```

Per feature, which is how you work day to day:

```bash
bun test tests/unit/auth               # or just: bun test auth
bunx playwright test tests/e2e/auth
bunx playwright test tests/e2e/auth/login.spec.ts -g "renders"
```

Playwright starts `bun dev` itself and reuses an already-running dev server, so there is
no separate step to remember.

## The `@backend` tag

Most e2e tests exercise routing, rendering and client-side validation, and need no API.
Tests that genuinely require a live backend get `@backend` in the title:

```ts
test("surfaces a server rejection for unknown credentials @backend", async ({ page }) => {
```

That makes the fast local loop possible (`test:e2e:local` excludes them) and lets CI run
the full set once Postgres and the API are up. Default to writing tests that do **not**
need the backend; reach for `@backend` only when the assertion is about real API behaviour.

## Screenshots as proof

Import `test` from `../support/test-base` rather than `@playwright/test` and take named
screenshots at the points a reviewer would want to see:

```ts
import { expect, test } from "../support/test-base";

test("renders the credential form", async ({ page, proof }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  await proof("empty login form");
});
```

Each call writes `tests/artifacts/screenshots/<feature>/<spec>/<test-title>/NN-name.png`,
numbered in call order, and attaches it to the HTML report. A passing run leaves a visual
record, not just a green tick.

Before each shot the fixture hides Next's dev-mode overlay badge and waits for in-flight
animations to finish, so entrance animations are never caught mid-fade. Do not pass
Playwright's `animations: "disabled"` here — it rewinds motion's entrance animations to
opacity 0 instead of completing them.

Failure screenshots and traces are separate and automatic (`screenshot: "only-on-failure"`,
`trace: "on-first-retry"`).

## What belongs where

**Unit** — anything that runs without a DOM: `lib/` helpers, tree/state utilities, Zustand
store actions (call `useProjectEditorHook.getState().action()` directly, no React needed).

**E2E** — user-visible flows, routing, the `proxy.ts` auth redirect/refresh, and anything
touching an `async` Server Component. Next's own docs recommend E2E over unit tests for
those, since they cannot be rendered by a unit runner.

**Neither** — presentational components that only compose shadcn primitives. Testing them
mostly tests shadcn. Add a component test when a component grows logic of its own, and at
that point switch the unit layer to Vitest rather than bolting a second runner alongside
`bun test`.
