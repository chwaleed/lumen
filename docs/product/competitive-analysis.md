# Competitive analysis

**Status:** current as of 2026-10-09. Figures taken from vendors' own pages on that date.

Why this file exists: "why build this when Overleaf exists" is the first question an
examiner, an investor or a new engineer asks, and the honest answer has moved. Overleaf
shipped AI in 2025. The old pitch ("they have no AI") is dead. What follows is the
version that survives scrutiny.

---

## The market

Overleaf is the default and is not close to being displaced: Digital Science put it at
**20+ million users** when it launched its AI writing tools in June 2025. Any argument
that starts by predicting users will abandon it is not credible. The opening is a gap in
capability, not in market share.

## The four systems worth comparing

### 1. Overleaf — the incumbent

| | |
|---|---|
| Free | $0, **1 collaborator per project**, basic compile timeout, **5 AI uses per day** |
| Student | $8.25/mo annual, 10 collaborators, **24× basic compile timeout** |
| Standard | $16.75/mo annual, 10 collaborators, 10 AI uses/day |
| Pro | $33.25/mo annual, unlimited collaborators, full AI access |

Strengths: enormous template library, real-time collaboration, Git/Dropbox/reference
manager integrations, institutional accounts.

**AI, precisely.** Overleaf has an AI Assistant, Error Assist, Writefull language
suggestions, TeXGPT, an equation generator and a table generator. This is a real feature
set and it must not be understated. What it does *not* do is stated in Overleaf's own
documentation: Error Assist "explains LaTeX errors and suggests fixes," the assistant
lets you "chat with your document," and the docs instruct users to "always review
suggestions before applying them." The human applies every change, runs every compile,
and reads every resulting error.

**The limits that matter to a thesis writer:**

- **The free compile timeout.** A thesis with a bibliography, TikZ figures and a
  first-run index does not finish in the basic window. The fix is a subscription.
- **AI is metered by the day,** not by the task. Five uses does not survive one real
  debugging session.
- **The assistant is turn-based.** It cannot create a file, wire it in with `\input`,
  compile, read the log and correct itself. That loop is the actual work.

### 2. Papeeria

Free tier allows unlimited public projects but only **1 active private project**; Delta
is **$5/month** for up to 10 private projects and priority compiling, free for verified
students. Distinctive: gnuplot plotting, Git sync, Mendeley integration.

Weakness: a public-by-default free tier is unusable for unpublished thesis work, and
there is no AI assistance of substance.

### 3. TeXPage

**30-second compile limit free**, 300–600s paid, entry paid tier **$5/month**. Git on
the free plan. Sells on security: encrypted in transit and at rest. Visual formula
editor and GUI table generation.

Weakness: 30 seconds is below what a long document needs, and the GUI helpers address
symptoms of LaTeX's difficulty rather than the project-scale problem.

### 4. The local toolchain (TeX Live + TeXstudio or VS Code)

Free and unlimited, which the hosted editors are not. The costs are a multi-gigabyte
install, manual package management, and no help when a build breaks. Copilot-style
assistance in VS Code completes the current file; it has no model of the project and no
awareness of whether the document compiles.

---

## Where every one of them stops

All four leave the same loop to the human:

> write → compile → read an error that names a line but not the cause → guess → compile
> again

For a 40-file thesis this loop is most of the work, and it is precisely the loop that
software development automated years ago. Claude Code, Cursor and similar tools edit
many files, run the build, read the failure and iterate. **Nothing does that for LaTeX.**

## Our position

Two claims, both narrow enough to defend:

1. **Compilation is free and unlimited.** Not a trial, not metered. This is the
   acquisition feature and it directly answers the one limit free users actually hit.
2. **The agent closes the loop rather than advising on it.** It lists and reads files,
   writes changes, starts a compile, reads the parsed log, and iterates until the
   document builds. Overleaf's AI suggests; ours acts, with every change shown as a diff
   before it lands and every edit revertable through append-only snapshots.

Supporting, not leading: parsed errors that link to the source line including inside an
`\input`-ed subfile, and a sandboxed compiler (no network, CPU/memory/PID/wall-clock
capped) so untrusted documents cannot reach the host.

## Risks to this position, stated honestly

- **Overleaf can build an agent.** They have the users, the money and the head start.
  Our defence is focus and speed, not a moat.
- **Our agent is not built yet.** The tool loop, compile-fix iteration, multi-file
  editing and diff review are all unbuilt as of this date. Until they ship, the product
  is a competent free editor and the differentiator is a plan.
- **Citation fabrication is an existential risk, not a bug.** One invented reference in
  a submitted thesis ends the product's credibility in academia.
- **No realtime collaboration.** Deliberate for v1, but it is the feature Overleaf users
  name first, and the single-owner model will not survive contact with a research group.

---

## Sources

- Overleaf plans and pricing — https://www.overleaf.com/user/subscription/plans
- Overleaf AI features documentation — https://docs.overleaf.com/integrations-and-add-ons/ai-features
- Overleaf compile timeouts — https://docs.overleaf.com/troubleshooting-and-support/fixing-and-preventing-compile-timeouts
- Digital Science, AI writing tools for 20M+ Overleaf users (June 2025) — https://www.digital-science.com/blog/2025/06/digital-science-launches-new-cutting-edge-ai-writing-tools-for-20-million-overleaf-users/
- Papeeria — https://papeeria.com/
- TeXPage figures via comparison surveys; verify against https://www.texpage.com before citing in print
