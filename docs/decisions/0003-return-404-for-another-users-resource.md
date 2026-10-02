# ADR 0003: Return 404, not 403, for another user's resource

**Status:** Accepted

## Context

Project ids are sequential integers. Requesting a project you do not own has two plausible
answers: 403 (it exists, you may not have it) or 404 (as far as you are concerned, it does
not exist).

403 is more truthful, but it confirms the id is real. Iterating ids would map how many
projects exist and when they were created.

## Decision

`get_project_for_user` filters on `user_id` and raises **404** when no row matches —
whether the project is missing or simply someone else's. Both cases are indistinguishable
from outside.

## Consequences

- Project ids cannot be probed for existence (NFR-S6).
- Every project, file-entry and upload route inherits this by routing through that one
  function; no router re-implements the check (NFR-M3).
- Debugging is marginally harder: a developer seeing 404 must check ownership as well as
  existence. Server-side logs still distinguish the two.
- Tests assert the 404 explicitly, so a future change to 403 fails loudly rather than
  silently widening what an attacker can learn.
