# ADR 0006: Report a missing API message as null

**Status:** Accepted

## Context

`requestApi` normalised every response to `{success, message, data}`. Two details were
wrong, and writing tests for the client surfaced both:

```ts
success: response.data?.success ?? response.status >= 200,
message: response.data?.message ?? "Request completed.",
```

axios is configured with `validateStatus: () => true`, so every status arrives as a
resolved response. `500 >= 200` is `true`, meaning **a 500 with a non-JSON body was reported
as a success**. And substituting `"Request completed."` for a missing message meant a failed
login could display that text — while making the context-specific fallback every caller had
written (`payload.message ?? "Unable to log in right now."`) permanently unreachable, since
`??` only triggers on null or undefined.

Fourteen call sites were written expecting that fallback to work.

## Decision

Fix both at the source rather than at the call sites:

```ts
success: response.data?.success ?? (response.status >= 200 && response.status < 300),
message: response.data?.message || null,
```

`ApiResponse.message` becomes `string | null`. The same change was applied to
`lib/auth/backend.ts`, which had the identical pair of bugs.

## Consequences

- A 500 is a failure (NFR-R4).
- Every caller's context-specific wording now works as written (NFR-U2) — fourteen latent
  bugs fixed by two lines, with no call-site edits.
- `message` is nullable, so consumers must handle null. Every existing caller already did,
  via `??`.
- `frontend/tests/unit/http/client.test.ts` pins both behaviours; restoring the old logic
  fails seven of its tests.
